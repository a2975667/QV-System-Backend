import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { Question } from '../../question.schema';
import { Setting } from "../../q-setting.schema";

export type TextInputQuestionDocument = TextInputQuestion & Document;

@Schema({ collection: 'questions'})
export class TextInputQuestion extends Question {
 @Prop()
 description: string;

 @Prop()
 question: string;

 @Prop()
 setting: Setting;
}

export const TextInputQuestionSchema = SchemaFactory.createForClass(TextInputQuestion);