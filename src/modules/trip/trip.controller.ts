import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from 'src/common/authorization/decorators/public.decorator';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { CreateTripDto, TripQueryDto, UpdateTripDto } from './dto/trip.dto';
import { TripService } from './trip.service';

@ApiTags('trips')
@Controller({ path: 'trips', version: '1' })
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a trip and materialize trip seats' })
  create(@Body() dto: CreateTripDto) {
    return this.tripService.create(dto);
  }

  @Get()
  @AllowAnonymous()
  @ApiOperation({ summary: 'List trips' })
  list(@Query() query: TripQueryDto) {
    return this.tripService.list(query);
  }

  @Get(':id')
  @AllowAnonymous()
  @ApiOperation({ summary: 'Get trip by id' })
  getById(@Param('id') id: string) {
    return this.tripService.getById(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update trip' })
  update(@Param('id') id: string, @Body() dto: UpdateTripDto) {
    return this.tripService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete trip' })
  remove(@Param('id') id: string) {
    return this.tripService.remove(id);
  }
}
