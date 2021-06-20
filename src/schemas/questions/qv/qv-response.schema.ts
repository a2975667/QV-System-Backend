import { QuestionResponse } from '../../questionResponse.schema';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type QVResponseDocument = QVResponse & Document;

@Schema()
export class QVResponse extends QuestionResponse {
  @Prop()
  votes: [
    {
      optionName: string;
      votes: number;
    },
  ];
}

export const QVResponseSchema = SchemaFactory.createForClass(QVResponse);
