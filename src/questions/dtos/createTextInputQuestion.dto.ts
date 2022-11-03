import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Matches, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';

// Unsure whether need TextInputSettings
export class TextInputSettings {
  @IsNumber()
  @IsNotEmpty()
  version: number;

  @IsString()
  @IsNotEmpty()
  @Matches('text-input')
  questionType: string;
}

export class CreateUpdateTextInputQuestionDto {
  @IsNotEmpty()
  surveyId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  @Matches(/^text-input$/)
  type: string;

  @IsString()
  description: string;

  @IsString()
  @IsNotEmpty()
  question: string;

  @Type(() => TextInputSettings)
  @IsNotEmpty()
  @ValidateNested()
  setting: TextInputSettings;

  @IsOptional()
  @IsNumber()
  insertPosition: number;
}
