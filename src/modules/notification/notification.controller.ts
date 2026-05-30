import { Body, Controller, Post, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { SendNotificationDto } from './dto/notification.dto';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller({ path: 'notifications', version: '1' })
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN, SystemRolesEnum.BUS_OPERATOR)
  @ApiOperation({ summary: 'Send an operational notification' })
  send(@Body() dto: SendNotificationDto) {
    return this.notificationService.send(dto);
  }
}
