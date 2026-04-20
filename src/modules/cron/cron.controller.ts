import { Body, Controller, Get, Post, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { ExpireSeatsDto } from './dto/cron.dto';
import { CronService } from './cron.service';

@ApiTags('jobs')
@ApiBearerAuth()
@Controller({ path: 'jobs', version: '1' })
export class CronController {
  constructor(private readonly cronService: CronService) {}

  @Get('health')
  @Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Job module health check' })
  health() {
    return { status: 'ok' };
  }

  @Post('expire-seat-reservations')
  @Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Manually expire stale seat reservations' })
  expireSeatReservations(@Body() dto: ExpireSeatsDto) {
    return this.cronService.expireReservedSeats(dto.olderThanMinutes);
  }
}
