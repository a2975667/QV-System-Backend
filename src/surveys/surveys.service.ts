import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role } from 'src/auth/roles/role.enum';
import { UsersService } from 'src/users/users.service';
import { Survey, SurveyDocument } from '../schemas/survey.schema';
import { CreateSurveyDto } from './dtos/createSurvey.dto';
import { UpdateSurveyDto } from './dtos/updateSurvey.dto';
import { UpdateUserDto } from 'src/users/dtos/updateUser.dto';
import { plainToClass } from 'class-transformer';
import { UpdateSurveyQuestionsDto } from './dtos/updateSurveyQuestions.dto';
import { UserResponseService } from 'src/response/user-response.service';

@Injectable()
export class SurveysService {
  constructor(
    @InjectModel(Survey.name)
    private surveyModel: Model<SurveyDocument>,
    private usersService: UsersService,
    private userResponseService: UserResponseService,
  ) {}

  async getAllSurveys(): Promise<Survey[] | undefined> {
    return this.surveyModel.find().exec();
  }

  async findSurveyById(
    userid: string,
    surveyId: string,
  ): Promise<Survey | undefined> {
    const userInfo = await this.usersService.findUserById(userid);
    if (
      userInfo.roles.includes(Role.Admin) ||
      userInfo.surveys.includes(surveyId)
    ) {
      // TODO: fix surveyID type to ObjectId Type
      return await this._findSurveyById(Types.ObjectId(surveyId));
    } else {
      throw new UnauthorizedException();
    }
  }

  async serveSurveyToPublicById(
    surveyId: string,
    sKey?: string,
    uKey?: string,
    uuid?: string,
  ): Promise<Survey | undefined> {
    const survey = await this._findSurveyById(Types.ObjectId(surveyId));
    console.log(sKey, uKey);
    if (!survey.settings.isAvaliable) {
      throw new ForbiddenException(
        'The survey is currently not avaliable. Please contact the survey designer if you think this is a mistake. [SS055]',
      );
    }

    if (survey.settings.hasSKey && sKey !== survey.settings.sKeyValue) {
      throw new ForbiddenException(
        'The key is incorrect. Please contact the survey designer if you think this is a mistake. [SS061]',
      );
    }

    // frontend should require user to input a unique code.
    if (survey.settings.hasUKey && uKey === undefined) {
      throw new ForbiddenException(
        'The survey requires a unique code. Please contact the survey designer if you think this is a mistake. [SS070]',
      );
    }

    // this validates that the ukey is unique and not completed.
    if (!uKey) {
      let userSurveyResponse = undefined;
      try {
        userSurveyResponse = this.userResponseService._findSurveyResponseByUKey(
          uKey,
        );
        if (userSurveyResponse.status === 'Complete') {
          throw new ForbiddenException(
            'The survey has been submitted. Please contact the survey designer if you think this is a mistake. [SS082]',
          );
        }
      } catch (BadRequestException) {
        // the ukey is not been consumed, free to submit
        return survey;
      }
      // the ukey has been consumed, free to fetch and update
      return survey;
    }

    // this validates that the ukey is unique and not completed.
    if (!uuid) {
      let userSurveyResponse = undefined;
      try {
        userSurveyResponse = this.userResponseService._findSurveyResponseByUUID(
          uuid,
        );
        if (userSurveyResponse.status === 'Complete') {
          throw new ForbiddenException(
            'The survey has been submitted. Please contact the survey designer if you think this is a mistake. [SS082]',
          );
        }
      } catch (BadRequestException) {
        // the uuid is not been consumed, uuid can only be generated by system
        throw new ForbiddenException(
          'The survey has been submitted. Please contact the survey designer if you think this is a mistake. [SS082]',
        );
      }
      // the uuid is incomplete, please go fetch response with uuid
      return survey;
    }

    return undefined;
  }

  async createNewSurvey(
    userid: string,
    createSurveyDto: CreateSurveyDto,
  ): Promise<Survey> {
    const createdSurvey = new this.surveyModel(createSurveyDto);
    createdSurvey.collaborators = [...createdSurvey.collaborators, userid];
    const completeCreatedSurvey = await createdSurvey.save();
    let usersurvey = (await this.usersService.findUserById(userid)).surveys;
    usersurvey = [...usersurvey, completeCreatedSurvey._id];
    const updateUserDto = plainToClass(UpdateUserDto, { surveys: usersurvey });
    await this.usersService.updateUserbyId(userid, updateUserDto);
    return completeCreatedSurvey;
  }

  async updateSurveyById(
    userid: string,
    id: string,
    updateSurveyDto: UpdateSurveyDto,
  ) {
    const userInfo = await this.usersService.findUserById(userid);
    if (userInfo.roles.includes(Role.Admin) || userInfo.surveys.includes(id)) {
      return await this.surveyModel
        .findByIdAndUpdate(id, updateSurveyDto, { returnOriginal: false })
        .exec();
    } else {
      throw new UnauthorizedException();
    }
  }

  async updateSurveyQuestionsById(
    userid: string,
    id: string,
    updateSurveyQuestionsDto: UpdateSurveyQuestionsDto,
  ) {
    const userInfo = await this.usersService.findUserById(userid);
    if (userInfo.roles.includes(Role.Admin) || userInfo.surveys.includes(id)) {
      return await this.surveyModel
        .findByIdAndUpdate(id, updateSurveyQuestionsDto, {
          returnOriginal: false,
        })
        .exec();
    } else {
      throw new UnauthorizedException();
    }
  }

  async removeSurveyById(
    userid: string,
    id: string,
  ): Promise<Survey | undefined> {
    const userInfo = await this.usersService.findUserById(userid);
    if (userInfo.roles.includes(Role.Admin) || userInfo.surveys.includes(id)) {
      const collaborators = await (
        await this.surveyModel.findOne({ _id: id }).exec()
      ).collaborators;

      await Promise.all(
        collaborators.map(async (uid) => {
          const currUserSurveys = (await this.usersService.findUserById(uid))
            .surveys;
          const updateUserDto = plainToClass(UpdateUserDto, {
            surveys: currUserSurveys.filter((n) => {
              return n != id;
            }),
          });
          await this.usersService.updateUserbyId(userid, updateUserDto);
        }),
      );
      return await this.surveyModel.findByIdAndRemove(id).exec();
    } else {
      throw new UnauthorizedException();
    }
  }

  async _findSurveyById(surveyId: Types.ObjectId): Promise<Survey | undefined> {
    const returnedSurvey = await this.surveyModel
      .findOne({ _id: surveyId })
      .exec();
    if (returnedSurvey) {
      return returnedSurvey;
    } else {
      throw new BadRequestException('Cannot Find Survey. [SS0040]');
    }
  }
}
