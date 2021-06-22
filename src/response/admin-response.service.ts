import { UsersService } from './../users/users.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QuestionsService } from 'src/questions/questions.service';
import { Question, QuestionDocument } from 'src/schemas/question.schema';
import {
  QuestionResponse,
  QuestionResponseDocument,
} from 'src/schemas/questionResponse.schema';
import {
  SurveyResponse,
  SurveyResponseDocument,
} from 'src/schemas/surveyResponse.schema';
import { SurveysService } from 'src/surveys/surveys.service';
import { Role } from 'src/auth/roles/role.enum';

@Injectable()
export class AdminResponseService {
  constructor(
    @InjectModel(SurveyResponse.name)
    private surveyResponseModel: Model<SurveyResponseDocument>,
    @InjectModel(QuestionResponse.name)
    private questionResponseModel: Model<QuestionResponseDocument>,
    @InjectModel(Question.name)
    private questionModel: Model<QuestionDocument>,
    private surveysService: SurveysService,
    private questionsService: QuestionsService,
    private usersService: UsersService,
  ) {}

  async getAllSurveyResponses(userId: Types.ObjectId, params: any) {
    await this.usersService.verifyUserPermissionById(userId, [Role.Admin]);
    const { sort, limit, ...remaining_params } = params;
    // eslint-disable-next-line prefer-const
    let { direction, ...other_params } = remaining_params;
    if (!direction) direction = 1;
    return await this.surveyResponseModel
      .find(other_params)
      .sort({ [sort]: direction })
      .limit(parseInt(limit));
  }

  // TODO: this needs to fix to fit question response, only allow surveyResponseID, questionId
  async getAllQuestionResponses(userId: Types.ObjectId, params: any) {
    await this.usersService.verifyUserPermissionById(userId, [Role.Admin]);
    const { sort, limit, ...remaining_params } = params;
    // eslint-disable-next-line prefer-const
    let { direction, ...other_params } = remaining_params;
    if (!direction) direction = 1;
    return await this.questionResponseModel
      .find(other_params)
      .sort({ [sort]: direction })
      .limit(parseInt(limit));
  }
  // need to verify that verifyUserPermissionById works for designer.
}
