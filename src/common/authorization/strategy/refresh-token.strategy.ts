import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthJwtConfig, AuthenticatedUser, JwtRefreshPayload } from '../types/auth.types';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(@Inject('AUTH_JWT_CONFIG') cfg: AuthJwtConfig) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: cfg.refreshSecret,
    });
  }

  async validate(payload: JwtRefreshPayload) {
    if (!payload || payload.typ !== 'refresh' || !payload.sub || !payload.jti) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user: AuthenticatedUser = {
      id: payload.sub,
      refreshTokenId: payload.jti,
      roles: [],
    };

    return user;
  }
}
