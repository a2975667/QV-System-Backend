import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Matches, ValidateNested } from 'class-validator';
import { Types } from 'mongoose';
export class TextInputSettings {
  @IsNumber()
  @IsNotEmpty()
  version: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^text-input$/)
  questionType: string;
}

export class UpdateTextInputSettingsDto {
  @IsNotEmpty()
  surveyId: Types.ObjectId;

  @Type(() => TextInputSettings)
  @IsNotEmpty()
  @ValidateNested()
  setting: TextInputSettings;
}
