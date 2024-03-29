import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import { CreateSurveyDto } from './dtos/createSurvey.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Mongoose, Types } from 'mongoose';
import { plainToClass } from 'class-transformer';
import { Survey, SurveyDocument } from '../schemas/survey.schema';
import { UpdateSurveyDto } from './dtos/updateSurvey.dto';
import { UpdateSurveyQuestionsDto } from './dtos/updateSurveyQuestions.dto';
import { UpdateUserDto } from 'src/users/dtos/updateUser.dto';
import { UsersService } from 'src/users/users.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  QVQuestion,
  QVQuestionDocument,
  QVQuestionSchema,
} from 'src/schemas/questions/qv/qv-question.schema';
// import { QVQuestionSchema } from 'src/schemas/questions/likert/likert.question.schema';
import {
  Question,
  QuestionDocument,
  QuestionSchema,
} from 'src/schemas/question.schema';

@Injectable()
export class SurveysService {
  constructor(
    @InjectModel(Survey.name)
    private surveyModel: Model<SurveyDocument>,
    @InjectModel(Question.name)
    private questionModel: Model<QuestionDocument>,
    @InjectModel(QVQuestion.name)
    private qvQuestionModel: Model<QVQuestionDocument>,
    private usersService: UsersService,
    private coreService: CoreService,
    private coreLogicService: CoreLogicService,
  ) {}

  async getAllSurveys(): Promise<Survey[] | undefined> {
    return this.surveyModel.find().exec();
  }

  async findSurveyById(
    userId: Types.ObjectId,
    surveyId: Types.ObjectId,
  ): Promise<Survey | undefined> {
    const user = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    if (this.coreLogicService.validateSurveyOwnership(user, survey)) {
      return survey;
    } else {
      throw new InternalServerErrorException(
        'Something went wrong getting survey [SS0050]',
      );
    }
  }

  async servePublicSurveyById(
    surveyId: Types.ObjectId,
    sKey?: string,
    uKey?: string,
    uuid?: string,
  ) {
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateContentAvaliable(survey, 'surveyId');
    const questions = await this.coreService.getQuestionsByManyIds(
      survey.questions,
    );

    const tempQuestionDocumentList = [];

    questions.forEach((question) => {
      if (question.setting.questionType === 'qv') {
        if (question.get('setting.sampleOption')) {
          const sampleCount = question.get('setting.sampleOption');
          const allOptions = question.get('options');

          const tmpQuestion = JSON.parse(JSON.stringify(question));
          const sampledOptions = allOptions
            .sort(() => Math.random() - 0.5)
            .slice(0, sampleCount);
          tmpQuestion.options = sampledOptions;

          // cast tmpQuestion to QuestionDocument
          const createQvModel = this.qvQuestionModel;
          const updatedQuestion = new createQvModel(tmpQuestion);

          tempQuestionDocumentList.push(updatedQuestion);
        } else {
          // backward compatibility, might want to remove moving forward.
          // if the question does not specify how many options to sample, we provide the entire list
          // this should be written in the previous if statement and then throw an deprecation error.
          tempQuestionDocumentList.push(question);
        }
      } else {
        // this is for other types of questions that we might need to post process
        tempQuestionDocumentList.push(question);
      }
    });

    // console.log(tempQuestionDocumentList);

    this.coreLogicService.validateSurveyOpen(survey);
    this.coreLogicService.validateSurveySKey(survey, sKey);
    this.coreLogicService.requireUkey(survey, uKey);

    survey.questions = this.coreLogicService.mergeIdListWithDocList(
      survey.questions,
      tempQuestionDocumentList,
      ['responses'],
    );

    // console.log(survey.questions);

    // removes sensitive information
    survey.responses = undefined;
    survey.collaborators = undefined;

    // this validates that the uuid is valid
    if (uuid) {
      const surveyResponse = await this.coreService.getSurveyResponseByUUID(
        uuid,
      );
      if (this.coreLogicService.validateUUIDAvaliable(surveyResponse)) {
        if (surveyResponse.surveyId !== surveyId) {
          throw new ForbiddenException(
            'The uuid does not match the requested surveyId. Stop stealing the survey! [SS0089]',
          );
        }
        if (uKey || surveyResponse.uKey) {
          this.coreLogicService.validateSurveyResponseUKey(
            surveyResponse,
            uKey,
          );
        }
        return survey;
      } else {
        throw new BadRequestException('Something critical failed. [SS0092]');
      }
    }

    // this validates that the ukey is not consumed.
    if (uKey) {
      const surveyResponse = await this.coreService.getSurveyResponseByUKey(
        uKey,
        surveyId,
      );
      if (this.coreLogicService.validateUKeyAvaliable(surveyResponse)) {
        return survey;
      } else {
        throw new BadRequestException(
          'The uKey is being consumed. Please provide UUID or use a new uKey. [SS0107]',
        );
      }
    }

    return survey;
  }

  async createNewSurvey(
    userId: Types.ObjectId,
    createSurveyDto: CreateSurveyDto,
  ): Promise<Survey> {
    const createdSurvey = new this.surveyModel(createSurveyDto);
    createdSurvey.collaborators = [...createdSurvey.collaborators, userId];
    const completeCreatedSurvey = await createdSurvey.save();
    let usersurvey = (await this.usersService.findUserById(userId)).surveys;
    usersurvey = [...usersurvey, completeCreatedSurvey._id];
    const updateUserDto = plainToClass(UpdateUserDto, { surveys: usersurvey });
    await this.usersService.updateUserbyId(userId, updateUserDto);
    return completeCreatedSurvey;
  }

  async updateSurveyById(
    userId: Types.ObjectId,
    surveyId: Types.ObjectId,
    updateSurveyDto: UpdateSurveyDto,
  ) {
    const userInfo = await this.coreService.getUserById(userId);
    if (
      this.coreLogicService.validateUserAccessBySurveyId(userInfo, surveyId)
    ) {
      return await this.surveyModel
        .findByIdAndUpdate(surveyId, updateSurveyDto, { returnOriginal: false })
        .exec();
    }
  }

  async updateSurveyQuestionsById(
    userId: Types.ObjectId,
    surveyId: Types.ObjectId,
    updateSurveyQuestionsDto: UpdateSurveyQuestionsDto,
  ) {
    const userInfo = await this.coreService.getUserById(userId);
    if (
      this.coreLogicService.validateUserAccessBySurveyId(userInfo, surveyId)
    ) {
      return await this.surveyModel
        .findByIdAndUpdate(surveyId, updateSurveyQuestionsDto, {
          returnOriginal: false,
        })
        .exec();
    }
  }

  async removeSurveyById(
    userId: Types.ObjectId,
    surveyId: Types.ObjectId,
  ): Promise<Survey | undefined> {
    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    const collaborators = survey.collaborators;

    await Promise.all(
      collaborators.map(async (uid) => {
        const currUserSurveys = (await this.usersService.findUserById(uid))
          .surveys;
        const updateUserDto = plainToClass(UpdateUserDto, {
          surveys: currUserSurveys.filter((n) => {
            return n != surveyId;
          }),
        });
        await this.usersService.updateUserbyId(userId, updateUserDto);
      }),
    );
    return await this.surveyModel.findByIdAndRemove(surveyId).exec();
  }
}
