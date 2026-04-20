import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { UpdateUserStatusDto, UserQueryDto, UserRoleMutationDto } from './dto/user.dto';
import { UserService } from './user.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
@Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'List users' })
  list(@Query() query: UserQueryDto) {
    return this.userService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  getById(@Param('id') id: string) {
    return this.userService.getById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update a user status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateUserStatusDto) {
    return this.userService.updateStatus(id, dto);
  }

  @Post(':id/roles')
  @ApiOperation({ summary: 'Assign role to user' })
  addRole(@Param('id') id: string, @Body() dto: UserRoleMutationDto) {
    return this.userService.addRole(id, dto);
  }

  @Delete(':id/roles')
  @ApiOperation({ summary: 'Revoke role from user' })
  removeRole(@Param('id') id: string, @Body() dto: UserRoleMutationDto) {
    return this.userService.removeRole(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a user' })
  remove(@Param('id') id: string) {
    return this.userService.softDelete(id);
  }
}
