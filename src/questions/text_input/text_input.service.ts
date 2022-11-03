import { BadRequestException } from '@nestjs/common';
import { CoreLogicService } from 'src/core/core-logic.service';
import { CoreService } from 'src/core/core.service';
import { CreateUpdateTextInputQuestionDto } from '../dtos/createTextInputQuestion.dto';
import { UpdateTextInputSettingsDto } from '../dtos/updateTextInputSettings.dto';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { plainToClass } from 'class-transformer';
import { TextInputQuestion } from 'src/schemas/questions/text_input/text_input-question.schema';
import { TextInputQuestionDocument } from 'src/schemas/questions/text_input/text_input-question.schema';
import { SurveysService } from '../../surveys/surveys.service';
import { UpdateSurveyQuestionsDto } from 'src/surveys/dtos/updateSurveyQuestions.dto';

@Injectable()
export class TextInputService {
  constructor(
    @InjectModel(TextInputQuestion.name)
    private TextInputQuestionModel: Model<TextInputQuestionDocument>,
    private surveysService: SurveysService,
    private coreService: CoreService,
    private coreLogicService: CoreLogicService,
  ) {}

  async createTextInputQuestion(
    userId: Types.ObjectId,
    createTextInputQuestionDto: CreateUpdateTextInputQuestionDto,
  ): Promise<TextInputQuestion> {
    const { insertPosition, surveyId, ...createQuestion } = createTextInputQuestionDto;
    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    const createdTextInputQuestion = new this.TextInputQuestionModel(createQuestion);
    const createdQuestion = await createdTextInputQuestion.save();
    const currQuestionLength = survey.questions.length;

    let insertIndex = undefined;
    if (survey.questions === undefined || currQuestionLength === 0) {
      insertIndex = 0;
    } else if (
      insertPosition === undefined ||
      insertPosition > currQuestionLength
    ) {
      insertIndex = currQuestionLength;
    } else {
      insertIndex = insertPosition - 1;
    }
    survey.questions.splice(insertIndex, 0, createdQuestion._id);
    const updateSurveyQuestionsDto = plainToClass(UpdateSurveyQuestionsDto, {
      questions: survey.questions,
    });
    await this.surveysService.updateSurveyQuestionsById(
      userId,
      surveyId,
      updateSurveyQuestionsDto,
    );
    return createdQuestion;
  }

  async updateTextInputQuestionById(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateTextInputQuestionDto: CreateUpdateTextInputQuestionDto,
  ): Promise<TextInputQuestion> {
    const { surveyId, ...updateQuestion } = updateTextInputQuestionDto;
    if (updateQuestion.insertPosition) delete updateQuestion.insertPosition;

    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);
    const updatedQuestion = await this.TextInputQuestionModel.findByIdAndUpdate(
      questionId,
      updateQuestion,
      { returnOriginal: false },
    ).exec();

    if (updateQuestion) {
      return updatedQuestion;
    } else {
      throw new BadRequestException('Cannot Update Question. [QS0122]');
    }
  }

  async updateTextInputSettingsbyId(
    userId: Types.ObjectId,
    questionId: Types.ObjectId,
    updateTextInputSettingsDto: UpdateTextInputSettingsDto,
  ): Promise<TextInputQuestion> {
    const { surveyId, ...TextInputSettings } = updateTextInputSettingsDto;
    const userInfo = await this.coreService.getUserById(userId);
    const survey = await this.coreService.getSurveyById(surveyId);
    this.coreLogicService.validateSurveyOwnership(userInfo, survey);

    return this.TextInputQuestionModel.findByIdAndUpdate(
      questionId,
      // { setting: TextInputSettings.setting },
      { returnOriginal: false },
    );
  }
}
