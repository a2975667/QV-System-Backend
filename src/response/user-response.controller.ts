import { CompleteSurveyResponseDto } from './dto/completeSurveyResponse.dto';
import { RemoveQuestionResponseDto } from './dto/removeQuestionResponse.dto';
import { Body, Controller, Delete, Post, Put } from '@nestjs/common';
import { MethodNotAllowedException } from '@nestjs/common';
import { CreateQuestionResponseDto } from './dto/createQuestionResponse.dto';
import { UpdateQuestionResponseDto } from './dto/updateQuestionResponse.dto';
import { UserResponseService } from './user-response.service';
import { ApiBearerAuth } from '@nestjs/swagger';
@ApiBearerAuth()
@Controller('user')
export class UserResponseController {
  constructor(private userResponseService: UserResponseService) {}

  @Post('create-response')
  async createResponse(
    @Body() createQuestionResponseDto: CreateQuestionResponseDto,
  ) {
    if (!createQuestionResponseDto.uuid) {
      return this.userResponseService.createSurveyAndQuestionResponse(
        createQuestionResponseDto,
      );
    } else {
      return this.userResponseService.CreateQuestionAndUpdateSurveyResponse(
        createQuestionResponseDto,
      );
    }
  }

  @Put('update-response')
  updateResponse(@Body() updateQuestionResponseDto: UpdateQuestionResponseDto) {
    return this.userResponseService.updateQuestionResponse(
      updateQuestionResponseDto,
    );
  }

  @Delete('delete-response')
  deleteResponse(@Body() removeQuestionResponseDto: RemoveQuestionResponseDto) {
    return this.userResponseService.removeQuestionResponse(
      removeQuestionResponseDto,
    );
  }

  @Put('complete-survey')
  completeSurvey(@Body() completeSurveyResponseDto: CompleteSurveyResponseDto) {
    return this.userResponseService.markSurveyResponseAsCompleted(
      completeSurveyResponseDto,
    );
  }

  @Post('remove-survey')
  removeSurvey() {
    throw new MethodNotAllowedException(
      'Users are not allowed to remove submitted surveys',
    );
  }
}
