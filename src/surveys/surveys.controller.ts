import { RolesGuard } from 'src/auth/roles/roles.guard';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Controller, Get, Post, Delete } from '@nestjs/common';
import { Body, Param, Put, UseGuards, Request } from '@nestjs/common';
import { CreateSurveyDto } from './dtos/createSurvey.dto';
import { UpdateSurveyDto } from './dtos/updateSurvey.dto';
import { SurveysService } from './surveys.service';
import { Roles } from 'src/auth/roles/roles.decorator';
import { Role } from 'src/auth/roles/role.enum';

@Controller('surveys')
export class SurveysController {
  constructor(private surveyService: SurveysService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @Get()
  getUserSurveys() {
    return this.surveyService.getAllSurveys();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Get(':id')
  getSurveyById(@Request() req, @Param('id') id: string) {
    const userid = req.user.userId;
    return this.surveyService.findSurveyById(userid, id);
  }

  // TODO: Add Guest permission? Create a survey demo without account
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Post()
  createSurveyReturnId(
    @Request() req,
    @Body() createSurveyDto: CreateSurveyDto,
  ) {
    const userid = req.user.userId;
    console.log(createSurveyDto);
    return this.surveyService.createNewSurvey(userid, createSurveyDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Put(':id')
  updateSurveyById(
    @Request() req,
    @Param('id') id: string,
    @Body() updateSurveyDto: UpdateSurveyDto,
  ) {
    const userid = req.user.userId;
    return this.surveyService.updateSurveyById(userid, id, updateSurveyDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin, Role.Designer)
  @Delete(':id')
  removeSurveyById(@Request() req, @Param('id') id: string) {
    const userid = req.user.userId;
    return this.surveyService.removeSurveyById(userid, id);
  }

  // TODO: Add collaborator

  // TODO: Remove Collaborator
}
