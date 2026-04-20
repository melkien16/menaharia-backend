import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { CreateOperatorDto, OperatorQueryDto, UpdateOperatorDto } from './dto/operator.dto';
import { OperatorService } from './operator.service';

@ApiTags('operators')
@ApiBearerAuth()
@Controller({ path: 'operators', version: '1' })
@Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
export class OperatorController {
  constructor(private readonly operatorService: OperatorService) {}

  @Post()
  @ApiOperation({ summary: 'Create a transport operator' })
  create(@Body() dto: CreateOperatorDto) {
    return this.operatorService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List transport operators' })
  list(@Query() query: OperatorQueryDto) {
    return this.operatorService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transport operator by id' })
  getById(@Param('id') id: string) {
    return this.operatorService.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transport operator' })
  update(@Param('id') id: string, @Body() dto: UpdateOperatorDto) {
    return this.operatorService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a transport operator' })
  remove(@Param('id') id: string) {
    return this.operatorService.remove(id);
  }
}
