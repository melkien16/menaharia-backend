import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AccessTokenStrategy } from 'src/common/authorization/strategy/access-token.strategy';
import { RefreshTokenStrategy } from 'src/common/authorization/strategy/refresh-token.strategy';
import { AuthJwtConfig } from 'src/common/authorization/types/auth.types';

@Module({
  imports: [PassportModule, JwtModule.register({}), PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    {
      provide: 'AUTH_JWT_CONFIG',
      inject: [ConfigService],
      useFactory: (configService: ConfigService): AuthJwtConfig => ({
        secret: configService.getOrThrow<string>('jwt.secret'),
        expiresIn: configService.getOrThrow<string>('jwt.expiresIn'),
        refreshSecret: configService.getOrThrow<string>('jwt.refreshSecret'),
        refreshExpiresIn: configService.getOrThrow<string>('jwt.refreshExpiresIn'),
      }),
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
