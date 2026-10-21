import { AuthService } from './auth.service';
import { Controller, Get, Header, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { GoogleAuthGuard } from './google-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('api/v1')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Get('google-login')
  @ApiTags('User Profiles')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Req() req) {
    return req.user;
  }

  @Get('redirect')
  @ApiTags('Internal Calls')
  @UseGuards(GoogleAuthGuard)
  googleAuthRedirect(@Req() req, @Res() res) {
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    let loginData;
    try {
      loginData = this.authService.googleLogin(req);
    } catch {
      return res.redirect(`${frontendUrl}/login?error=oauth`);
    }
    if (!loginData.access_token || !loginData.user) {
      return res.redirect(`${frontendUrl}/login?error=oauth`);
    }
    
    // Add login data as query parameters directly in the redirect URL
    // This avoids cookie encoding/decoding issues
    const params = new URLSearchParams();
    params.append('token', loginData.access_token);
    if (loginData.user) {
      params.append('email', loginData.user.email);
      params.append('userId', loginData.user.id);
      params.append('roles', JSON.stringify(loginData.user.roles));
    }
    
    // Log the redirect for debugging
    console.log('Google Auth redirect completed, redirecting to frontend');
    
    // Redirect with query parameters
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(`${frontendUrl}/login-success?${params.toString()}`);
  }

  @Get('auth/session')
  @UseGuards(JwtAuthGuard)
  @Header('Cache-Control', 'no-store')
  session(@Req() req) {
    // Only verified claims, never a full user document (which has other fields).
    return {
      user: {
        id: req.user.userId,
        email: req.user.username,
        roles: req.user.roles,
      },
      expiresAt: req.user.expiresAt, // Unix seconds, like JWT exp.
    };
  }
}
