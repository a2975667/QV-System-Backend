import {
  IsMongoId,
  IsOptional,
  IsString,
  IsUUID,
  IsNotEmpty,
  ValidateNested,
  Length,
} from 'class-validator';
import { Types } from 'mongoose';
import { ResponseTypeLikert } from './likert-response.dto';
import { ResponseTypeQV } from './qv-response.dto';

export class UpdateQuestionResponseDto {
  @IsUUID()
  @IsOptional()
  uuid: string;

  @IsOptional()
  @IsString()
  SKey: string;

  @IsOptional()
  @Length(1)
  @IsString()
  UKey: string;

  @IsMongoId()
  @IsNotEmpty()
  surveyResponseId: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  questionResponseId: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  surveyId: Types.ObjectId;

  @IsMongoId()
  @IsNotEmpty()
  questionId: Types.ObjectId;

  @IsNotEmpty()
  @ValidateNested()
  responseContent: ResponseTypeQV | ResponseTypeLikert;
}
