import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { BusQueryDto, CreateBusDto, UpdateBusDto } from './dto/bus.dto';
import { BusService } from './bus.service';

@ApiTags('buses')
@ApiBearerAuth()
@Controller({ path: 'buses', version: '1' })
@Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
export class BusController {
  constructor(private readonly busService: BusService) {}

  @Post()
  @ApiOperation({ summary: 'Create a bus' })
  create(@Body() dto: CreateBusDto) {
    return this.busService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List buses' })
  list(@Query() query: BusQueryDto) {
    return this.busService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get bus by id' })
  getById(@Param('id') id: string) {
    return this.busService.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update bus' })
  update(@Param('id') id: string, @Body() dto: UpdateBusDto) {
    return this.busService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete bus' })
  remove(@Param('id') id: string) {
    return this.busService.remove(id);
  }
}
