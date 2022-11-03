import { CreateUpdateTextInputQuestionDto } from '../dtos/createTextInputQuestion.dto';
import { Body, Controller } from '@nestjs/common';
import { Request, UseGuards } from '@nestjs/common';
import { Param, Post, Put } from '@nestjs/common';
import { TextInputService } from './text_input.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Role } from 'src/auth/roles/role.enum';
import { Roles } from 'src/auth/roles/roles.decorator';
import { RolesGuard } from 'src/auth/roles/roles.guard';
import { UpdateTextInputSettingsDto } from '../dtos/updateTextInputSettings.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Types } from 'mongoose';

@ApiBearerAuth()
@ApiTags('Protected APIs: Questions')
@Controller('protected/questions')
export class TextInputController {
  constructor(private textInputService: TextInputService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Post('text-input')
  createTextInputQuestion(
    @Request() req,
    @Body() createTextInputQuestionDto: CreateUpdateTextInputQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.textInputService.createTextInputQuestion(userId, createTextInputQuestionDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put('textInputSettings/:id') // id also in body
  updateTextInputSettings(
    @Request() req,
    @Param('id') questionId: Types.ObjectId,
    @Body() updateTextInputSettingsDto: UpdateTextInputSettingsDto,
  ) {
    const userId = req.user.userId;
    return this.textInputService.updateTextInputSettingsbyId(
      userId,
      questionId,
      updateTextInputSettingsDto,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put(':id') // this should be pushed to body, not id
  updateTextInputQuestion(
    @Request() req,
    @Param('id') questionId: Types.ObjectId,
    @Body() updateTextInputQuestionDto: CreateUpdateTextInputQuestionDto,
  ) {
    const userId = req.user.userId;
    return this.textInputService.updateTextInputQuestionById(
      userId,
      questionId,
      updateTextInputQuestionDto,
    );
  }
}
