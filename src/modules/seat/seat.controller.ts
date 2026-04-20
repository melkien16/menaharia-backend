import { Body, Controller, Get, Post, Query, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from 'src/common/authorization/decorators/public.decorator';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { CreateSeatBatchDto, SeatQueryDto } from './dto/seat.dto';
import { SeatService } from './seat.service';

@ApiTags('seats')
@Controller({ path: 'seats', version: '1' })
export class SeatController {
  constructor(private readonly seatService: SeatService) {}

  @Post('batch')
  @ApiBearerAuth()
  @Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create bus seats in batch' })
  createBatch(@Body() dto: CreateSeatBatchDto) {
    return this.seatService.createBatch(dto);
  }

  @Get()
  @AllowAnonymous()
  @ApiOperation({ summary: 'List seats' })
  list(@Query() query: SeatQueryDto) {
    return this.seatService.list(query);
  }
}
