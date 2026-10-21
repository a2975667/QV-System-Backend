import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean;
    } catch {
      // Provider cancellation and strategy errors happen before the controller.
      // Never return provider error details or a partial credential to the SPA.
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      context.switchToHttp().getResponse().redirect(`${frontendUrl}/login?error=oauth`);
      return false;
    }
  }
}
