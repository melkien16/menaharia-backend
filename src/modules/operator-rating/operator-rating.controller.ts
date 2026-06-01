import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CurrentUserDto } from 'src/common/dtos/current-user.dto';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import {
  CreateOperatorRatingDto,
  OperatorRatingQueryDto,
  UpdateOperatorRatingDto,
} from './dto/operator-rating.dto';
import { OperatorRatingService } from './operator-rating.service';

@ApiTags('operator-ratings')
@ApiBearerAuth()
@Controller({ path: 'operator-ratings', version: '1' })
export class OperatorRatingController {
  constructor(private readonly service: OperatorRatingService) {}

  @Post()
  @ApiOperation({ summary: 'Create a rating for an operator' })
  create(@CurrentUser() user: CurrentUserDto, @Body() dto: CreateOperatorRatingDto) {
    return this.service.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List operator ratings' })
  list(@CurrentUser() user: CurrentUserDto, @Query() query: OperatorRatingQueryDto) {
    return this.service.list(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get operator rating by id' })
  getById(@CurrentUser() user: CurrentUserDto, @Param('id') id: string) {
    return this.service.getById(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a rating' })
  update(
    @CurrentUser() user: CurrentUserDto,
    @Param('id') id: string,
    @Body() dto: UpdateOperatorRatingDto,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete/withdraw a rating' })
  remove(@CurrentUser() user: CurrentUserDto, @Param('id') id: string) {
    return this.service.remove(id, user);
  }
}
