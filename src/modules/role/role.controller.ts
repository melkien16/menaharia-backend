import { Body, Controller, Delete, Get, Post, Query, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { AssignRoleDto, CreateRoleDto, RoleQueryDto } from './dto/role.dto';
import { RoleService } from './role.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller({ path: 'roles', version: '1' })
@Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a role' })
  create(@Body() dto: CreateRoleDto) {
    return this.roleService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List roles' })
  list(@Query() query: RoleQueryDto) {
    return this.roleService.list(query);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign a role to a user' })
  assign(@Body() dto: AssignRoleDto) {
    return this.roleService.assignRole(dto);
  }

  @Delete('assign')
  @ApiOperation({ summary: 'Revoke a role from a user' })
  revoke(@Body() dto: AssignRoleDto) {
    return this.roleService.revokeRole(dto);
  }
}
