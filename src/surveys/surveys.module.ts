import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Survey, SurveySchema } from 'src/schemas/survey.schema';
import { SurveysService } from './surveys.service';
import { ProtectedSurveysController } from './protected-surveys.controller';
import { UsersModule } from 'src/users/users.module';
import { UsersService } from 'src/users/users.service';
import { User, UserSchema } from 'src/schemas/user.schema';
import { SurveysController } from './surveys.controller';
import { UserResponseService } from 'src/response/user-response.service';
import {
  QuestionResponse,
  QuestionResponseSchema,
} from 'src/schemas/questionResponse.schema';
import {
  SurveyResponse,
  SurveyResponseSchema,
} from 'src/schemas/surveyResponse.schema';
import { Question, QuestionSchema } from 'src/schemas/question.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Survey.name, schema: SurveySchema },
      { name: User.name, schema: UserSchema },
      { name: SurveyResponse.name, schema: SurveyResponseSchema },
      { name: QuestionResponse.name, schema: QuestionResponseSchema },
      { name: Question.name, schema: QuestionSchema },
    ]),
    UsersModule,
  ],
  providers: [UsersService, SurveysService, UserResponseService],
  controllers: [ProtectedSurveysController, SurveysController],
  exports: [SurveysService],
})
export class SurveysModule {}
