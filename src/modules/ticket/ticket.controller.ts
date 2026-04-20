import { Controller, Get, Param, Query, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/common/authorization/decorators/roles.decorator';
import { SystemRolesEnum } from 'src/common/enums/users/roles.enum';
import { TicketQueryDto } from './dto/ticket.dto';
import { TicketService } from './ticket.service';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller({ path: 'tickets', version: '1' })
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get()
  @Roles(SystemRolesEnum.ADMIN, SystemRolesEnum.SUPER_ADMIN)
  @ApiOperation({ summary: 'List tickets' })
  list(@Query() query: TicketQueryDto) {
    return this.ticketService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by id' })
  getById(@Param('id') id: string) {
    return this.ticketService.getById(id);
  }
}
