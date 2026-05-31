import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from 'src/common/authorization/decorators/public.decorator';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CurrentUserDto } from 'src/common/dtos/current-user.dto';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import {
  BookingQueryDto,
  CreateBookingDto,
  CreateBookingForUserDto,
  CreateBookingWithAccountDto,
} from './dto/booking.dto';
import { BookingService } from './booking.service';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller({ path: 'bookings', version: '1' })
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({ summary: 'Reserve seats, create a booking, and initialize payment' })
  create(@CurrentUser() user: CurrentUserDto, @Body() dto: CreateBookingDto) {
    return this.bookingService.createBooking(user, dto);
  }

  @Post('register-and-book')
  @AllowAnonymous()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user and create a booking' })
  registerAndBook(@Body() dto: CreateBookingWithAccountDto) {
    return this.bookingService.createBookingWithAccount(dto);
  }

  @Post('for-user')
  @Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN, SystemRolesEnum.BUS_OPERATOR)
  @ApiOperation({ summary: 'Create a booking for another user' })
  createForUser(@Body() dto: CreateBookingForUserDto) {
    return this.bookingService.createBookingForUser(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List bookings' })
  list(@CurrentUser() user: CurrentUserDto, @Query() query: BookingQueryDto) {
    return this.bookingService.list(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a booking by id' })
  getById(@CurrentUser() user: CurrentUserDto, @Param('id') id: string) {
    return this.bookingService.getById(id, user);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  cancel(@CurrentUser() user: CurrentUserDto, @Param('id') id: string) {
    return this.bookingService.cancelBooking(id, user);
  }
}
