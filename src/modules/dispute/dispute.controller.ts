import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CurrentUserDto } from 'src/common/dtos/current-user.dto';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { CreateDisputeDto, DisputeQueryDto, UpdateDisputeDto } from './dto/dispute.dto';
import { DisputeService } from './dispute.service';

@ApiTags('disputes')
@ApiBearerAuth()
@Controller({ path: 'disputes', version: '1' })
export class DisputeController {
  constructor(private readonly disputeService: DisputeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a dispute for an operator' })
  create(@CurrentUser() user: CurrentUserDto, @Body() dto: CreateDisputeDto) {
    return this.disputeService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List disputes' })
  list(@CurrentUser() user: CurrentUserDto, @Query() query: DisputeQueryDto) {
    return this.disputeService.list(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute by id' })
  getById(@CurrentUser() user: CurrentUserDto, @Param('id') id: string) {
    return this.disputeService.getById(id, user);
  }

  @Patch(':id')
  @Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN, SystemRolesEnum.BUS_OPERATOR)
  @ApiOperation({ summary: 'Update dispute response or status' })
  update(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body() dto: UpdateDisputeDto,
  ) {
    return this.disputeService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Withdraw or soft delete a dispute' })
  remove(@CurrentUser() user: CurrentUserDto, @Param('id') id: string) {
    return this.disputeService.withdraw(id, user);
  }
}
