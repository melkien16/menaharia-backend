import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import * as Joi from 'joi';
import configuration from './config/configuration';
import { AppLoggerModule } from './common/logger/logger.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/authorization/guards/jwt-auth.guard';
import { RolesGuard } from './common/authorization/guards/roles.guard';
import { AppController } from './app.controller';
import { RoleModule } from './modules/role/role.module';
import { UserModule } from './modules/user/user.module';
import { OperatorModule } from './modules/operator/operator.module';
import { BusModule } from './modules/bus/bus.module';
import { DestinationModule } from './modules/destination/destination.module';
import { RouteModule } from './modules/route/route.module';
import { TripModule } from './modules/trip/trip.module';
import { SeatModule } from './modules/seat/seat.module';
import { BookingModule } from './modules/booking/booking.module';
import { PaymentModule } from './modules/payment/payment.module';
import { TicketModule } from './modules/ticket/ticket.module';
import { TravelerModule } from './modules/traveler/traveler.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AdminModule } from './modules/admin/admin.module';
import { CronModule } from './modules/cron/cron.module';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
      load: [configuration],

      validationSchema: Joi.object({
        APP_NAME: Joi.string().default('Noble Lemat Delivery And Marketplace API'),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'staging', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(10).required(),
        JWT_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_SECRET: Joi.string().min(10).required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        CORS_ORIGIN: Joi.string().default('*'),
        CORS_CREDENTIALS: Joi.boolean().default(false),
        SWAGGER_ENABLED: Joi.boolean().default(true),
        RATE_LIMIT_TTL: Joi.number().default(60),
        RATE_LIMIT_LIMIT: Joi.number().default(100),
        SEAT_RESERVATION_MINUTES: Joi.number().default(10),
        SEAT_SWEEP_INTERVAL_MS: Joi.number().default(60000),
      }),

      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
      },
    }),
    AppLoggerModule,
    PrismaModule,
    AuthModule,
    RoleModule,
    UserModule,
    OperatorModule,
    BusModule,
    DestinationModule,
    RouteModule,
    TripModule,
    SeatModule,
    BookingModule,
    PaymentModule,
    TicketModule,
    TravelerModule,
    NotificationModule,
    AdminModule,
    CronModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
