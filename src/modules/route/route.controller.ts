import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from 'src/common/authorization/decorators/public.decorator';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { CreateRouteDto, RouteQueryDto, UpdateRouteDto } from './dto/route.dto';
import { RouteService } from './route.service';

@ApiTags('routes')
@Controller({ path: 'routes', version: '1' })
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Post()
  @ApiBearerAuth()
  @Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a route' })
  create(@Body() dto: CreateRouteDto) {
    return this.routeService.create(dto);
  }

  @Get()
  @AllowAnonymous()
  @ApiOperation({ summary: 'List routes' })
  list(@Query() query: RouteQueryDto) {
    return this.routeService.list(query);
  }

  @Get(':id')
  @AllowAnonymous()
  @ApiOperation({ summary: 'Get route by id' })
  getById(@Param('id') id: string) {
    return this.routeService.getById(id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update route' })
  update(@Param('id') id: string, @Body() dto: UpdateRouteDto) {
    return this.routeService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete route' })
  remove(@Param('id') id: string) {
    return this.routeService.remove(id);
  }
}
