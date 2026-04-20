import { Controller, Get, Param, Query, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TravelerQueryDto } from './dto/traveler.dto';
import { TravelerService } from './traveler.service';

@ApiTags('travelers')
@ApiBearerAuth()
@Controller({ path: 'travelers', version: '1' })
export class TravelerController {
  constructor(private readonly travelerService: TravelerService) {}

  @Get()
  @ApiOperation({ summary: 'List traveler records' })
  list(@Query() query: TravelerQueryDto) {
    return this.travelerService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get traveler record by id' })
  getById(@Param('id') id: string) {
    return this.travelerService.getById(id);
  }
}
