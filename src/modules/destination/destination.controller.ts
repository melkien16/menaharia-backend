import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import {
  CreateDestinationDto,
  DestinationQueryDto,
  UpdateDestinationDto,
} from './dto/destination.dto';
import { DestinationService } from './destination.service';

@ApiTags('destinations')
@ApiBearerAuth()
@Controller({ path: 'destinations', version: '1' })
@Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
export class DestinationController {
  constructor(private readonly destinationService: DestinationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a destination' })
  create(@Body() dto: CreateDestinationDto) {
    return this.destinationService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List destinations' })
  list(@Query() query: DestinationQueryDto) {
    return this.destinationService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get destination by id' })
  getById(@Param('id') id: string) {
    return this.destinationService.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update destination' })
  update(@Param('id') id: string, @Body() dto: UpdateDestinationDto) {
    return this.destinationService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete destination' })
  remove(@Param('id') id: string) {
    return this.destinationService.remove(id);
  }
}
