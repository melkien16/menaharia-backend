import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TicketService } from './ticket.service';

@ApiTags('tickets')
@ApiBearerAuth()
@Controller({ path: 'tickets', version: '1' })
export class TicketController {
  constructor(private readonly ticketService: TicketService) {}

  @Get('booking/:bookingId')
  @ApiOperation({ summary: 'Get all tickets for a booking' })
  async getBookingTickets(@Param('bookingId') bookingId: string) {
    return this.ticketService.getTicketsForBooking(bookingId);
  }

  @Get(':ticketId/pdf')
  @ApiOperation({ summary: 'Download a ticket as PDF by ticket ID' })
  async downloadTicket(@Param('ticketId') ticketId: string, @Res() res: Response) {
    const pdfBuffer = await this.ticketService.getTicketPDF(ticketId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="ticket-${ticketId}.pdf"`);
    res.send(pdfBuffer);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate a ticket by QR code or ticket number' })
  @ApiQuery({ name: 'ticketNumber', required: false, description: 'Ticket number to validate' })
  @ApiQuery({ name: 'qrCode', required: false, description: 'QR code value to validate' })
  async validateTicket(
    @Query('ticketNumber') ticketNumber?: string,
    @Query('qrCode') qrCode?: string,
  ) {
    if (!ticketNumber && !qrCode) {
      return { valid: false, message: 'Provide either ticketNumber or qrCode' };
    }

    return this.ticketService.validateTicket(ticketNumber, qrCode);
  }
}
