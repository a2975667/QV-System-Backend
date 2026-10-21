import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('SECRET'),
    });
  }

  async validate(payload: any) {
    // A session must have a bounded lifetime and an account identity, even when
    // a token was signed by a trusted issuer.
    if (
      typeof payload.exp !== 'number' || !Number.isFinite(payload.exp) ||
      payload.exp <= Date.now() / 1000 ||
      typeof payload.user_id !== 'string' || !payload.user_id ||
      typeof payload.user_email !== 'string' || !payload.user_email ||
      !Array.isArray(payload.user_roles) ||
      !payload.user_roles.every(role => typeof role === 'string')
    ) {
      throw new UnauthorizedException('Authentication required');
    }
    return {
      userId: payload.user_id,
      username: payload.user_email,
      roles: payload.user_roles,
      expiresAt: payload.exp,
    };
  }
}
