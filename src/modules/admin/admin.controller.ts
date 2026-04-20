import { Controller, Get, Query, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { AdminDashboardQueryDto } from './dto/admin.dto';
import { AdminService } from './admin.service';

@ApiTags('admin')
@ApiBearerAuth()
@Controller({ path: 'admin', version: '1' })
@Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard metrics' })
  dashboard(@Query() query: AdminDashboardQueryDto) {
    return this.adminService.dashboard(query);
  }
}
