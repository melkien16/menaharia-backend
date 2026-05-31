import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CloudinaryStorageService } from 'src/modules/storage/cloudinary-storage.service';
import { EmailService } from 'src/common/email/email.service';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import * as QRCode from 'qrcode';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const svg2img = require('svg2img') as (svg: string, opts: object, cb: (err: any, buf: Buffer) => void) => void;
import * as fs from 'fs';
import * as path from 'path';

const BRAND_DARK = '#1a3d6e';
const BRAND_GOLD = '#d4a017';
const BRAND_LIGHT_BG = '#f4f7fb';
const TEXT_DARK = '#1f2937';
const TEXT_MUTED = '#6b7280';
const DIVIDER = '#dde3ed';
const WHITE = '#ffffff';

type GeneratedTicketRecord = {
  id: string;
  bookingId: string;
  travelerId: string;
  ticketNumber: string;
  qrCode: string;
  issuedAt: Date;
  traveler: {
    fullName: string;
    email: string;
    phone: string;
  };
};

type BookingContext = {
  bookingReference: string;
  totalAmount: number;
  route: { origin: string; destination: string; distance: number };
  departureTime: Date;
  arrivalTime: Date;
  plateNumber: string;
  userEmail?: string | null;
  userName?: string | null;
  userPhone?: string | null;
  seatsByTravelerId: Record<string, { seatNumber: string; seatType: string }>;
};

@Injectable()
export class TicketService {
  private readonly logger = new Logger(TicketService.name);
  private readonly stampPath = path.join(process.cwd(), 'src', 'asset', 'stamp.svg');

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: CloudinaryStorageService,
    private readonly emailService: EmailService,
  ) {}

  // ─── Called inside payment transaction (uses this.prisma via ALS proxy) ─────

  async generateForBooking(bookingId: string): Promise<void> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        bookingReference: true,
        travelers: { select: { id: true, fullName: true, email: true, phone: true } },
        tickets: { select: { travelerId: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const existingTravelerIds = new Set(booking.tickets.map((t) => t.travelerId));

    for (const traveler of booking.travelers) {
      if (existingTravelerIds.has(traveler.id)) continue;

      const ticketNumber = this.buildTicketNumber();
      const qrCode = `${ticketNumber}|${booking.bookingReference}|${traveler.id}`;

      await this.prisma.ticket.create({
        data: { bookingId, travelerId: traveler.id, ticketNumber, qrCode },
      });
    }
  }

  // ─── Called after transaction: generates PDFs, uploads, emails all pending ──

  async buildAndDispatchPendingPDFs(bookingId: string): Promise<void> {
    const tickets = await this.prisma.ticket.findMany({
      where: { bookingId, pdfUrl: null },
      include: { traveler: { select: { fullName: true, email: true, phone: true } } },
    });

    if (!tickets.length) {
      this.logger.warn(`No pending tickets found for booking ${bookingId}`);
      return;
    }

    const [ctx, stampBuffer] = await Promise.all([
      this.fetchBookingContext(bookingId),
      this.loadStampBuffer(120),
    ]);

    await Promise.all(
      tickets.map((ticket) =>
        this.processOneTicket(ticket, ctx, stampBuffer).catch((err) => {
          this.logger.error(`Failed processing ticket ${ticket.ticketNumber}: ${err?.message ?? err}`);
        }),
      ),
    );
  }

  private async processOneTicket(
    ticket: GeneratedTicketRecord,
    ctx: BookingContext,
    stampBuffer: Buffer,
  ) {
    const seat = ctx.seatsByTravelerId[ticket.travelerId];

    const qrBuffer = await QRCode.toBuffer(ticket.qrCode, {
      errorCorrectionLevel: 'H',
      width: 220,
      margin: 1,
    });

    const pdfBuffer = await this.buildPDF(ticket, ctx, seat, qrBuffer, stampBuffer);

    let pdfUrl: string | undefined;
    let pdfPublicId: string | undefined;

    try {
      const filename = `ticket-${ticket.ticketNumber}`;
      const uploaded = await this.storage.uploadPdfBuffer(pdfBuffer, filename, {
        folder: 'menaharia/tickets',
      });
      pdfUrl = uploaded.secureUrl;
      pdfPublicId = uploaded.publicId;

      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { pdfUrl, pdfPublicId },
      });
    } catch (err) {
      this.logger.warn(`Cloudinary upload failed for ${ticket.ticketNumber}: ${err?.message ?? err}`);
    }

    const recipientEmail = ticket.traveler.email || ctx.userEmail;
    if (recipientEmail) {
      try {
        await this.emailService.sendTicketEmail({
          to: recipientEmail,
          travelerName: ticket.traveler.fullName,
          bookingReference: ctx.bookingReference,
          ticketNumber: ticket.ticketNumber,
          route: `${ctx.route.origin} → ${ctx.route.destination}`,
          departureTime: ctx.departureTime,
          pdfBuffer,
          pdfFilename: `ticket-${ticket.ticketNumber}.pdf`,
        });
      } catch (err) {
        this.logger.warn(`Email failed for ${ticket.ticketNumber} → ${recipientEmail}: ${err?.message ?? err}`);
      }
    }
  }

  // ─── Fetch booking context for PDF generation ────────────────────────────────

  async fetchBookingContext(bookingId: string): Promise<BookingContext> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        trip: { include: { route: true, bus: { select: { plateNumber: true } } } },
        bookingSeats: {
          include: {
            tripSeat: { include: { seat: true } },
          },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    const seatsByTravelerId: Record<string, { seatNumber: string; seatType: string }> = {};
    for (const bs of booking.bookingSeats) {
      if (bs.travelerId) {
        seatsByTravelerId[bs.travelerId] = {
          seatNumber: bs.tripSeat.seat.seatNumber,
          seatType: bs.tripSeat.seat.seatType,
        };
      }
    }

    return {
      bookingReference: booking.bookingReference,
      totalAmount: booking.totalAmount,
      route: {
        origin: booking.trip.route.origin,
        destination: booking.trip.route.destination,
        distance: booking.trip.route.distance,
      },
      departureTime: booking.trip.departureTime,
      arrivalTime: booking.trip.arrivalTime,
      plateNumber: booking.trip.bus?.plateNumber ?? 'N/A',
      userEmail: booking.user.email,
      userName: booking.user.fullName,
      userPhone: booking.user.phone,
      seatsByTravelerId,
    };
  }

  // ─── PDF Re-download by ticket ID ─────────────────────────────────────────

  async getTicketPDF(ticketId: string): Promise<Buffer> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { traveler: true },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const ctx = await this.fetchBookingContext(ticket.bookingId);
    const seat = ctx.seatsByTravelerId[ticket.travelerId];
    const stampBuffer = await this.loadStampBuffer(120);
    const qrBuffer = await QRCode.toBuffer(ticket.qrCode, {
      errorCorrectionLevel: 'H',
      width: 220,
      margin: 1,
    });

    return this.buildPDF(
      { ...ticket, traveler: ticket.traveler },
      ctx,
      seat,
      qrBuffer,
      stampBuffer,
    );
  }

  // ─── Ticket validation ───────────────────────────────────────────────────────

  async validateTicket(ticketNumber?: string, qrCode?: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: ticketNumber ? { ticketNumber } : { qrCode },
      include: {
        booking: {
          include: {
            trip: { include: { route: true } },
            user: { select: { fullName: true } },
          },
        },
        traveler: { select: { fullName: true, email: true, phone: true } },
      },
    });

    if (!ticket) return { valid: false, message: 'Ticket not found' };

    const booking = ticket.booking;
    const isValid = booking.status === 'CONFIRMED';

    return {
      valid: isValid,
      message: isValid ? 'Ticket is valid' : 'Ticket is not active (booking not confirmed)',
      ticket: {
        ticketNumber: ticket.ticketNumber,
        issuedAt: ticket.issuedAt,
        pdfUrl: ticket.pdfUrl,
        passenger: ticket.traveler.fullName,
        route: `${booking.trip.route.origin} → ${booking.trip.route.destination}`,
        departureTime: booking.trip.departureTime,
        bookingReference: booking.bookingReference,
        bookingStatus: booking.status,
      },
    };
  }

  // ─── Get all tickets for a booking ──────────────────────────────────────────

  async getTicketsForBooking(bookingId: string) {
    const tickets = await this.prisma.ticket.findMany({
      where: { bookingId },
      include: { traveler: { select: { fullName: true, email: true, phone: true } } },
      orderBy: { issuedAt: 'asc' },
    });

    if (!tickets.length) throw new NotFoundException('No tickets found for this booking');
    return tickets;
  }

  // ─── PDF construction ────────────────────────────────────────────────────────

  private buildPDF(
    ticket: { ticketNumber: string; qrCode: string; issuedAt: Date; traveler: { fullName: string; email: string; phone: string } },
    ctx: BookingContext,
    seat: { seatNumber: string; seatType: string } | undefined,
    qrBuffer: Buffer,
    stampBuffer: Buffer,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 0, info: { Title: `Ticket ${ticket.ticketNumber}`, Author: 'Menaharia PLC' } });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const W = 595.28;

        // ── Page background ──────────────────────────────────────────────────
        doc.rect(0, 0, W, 841.89).fill(BRAND_LIGHT_BG);

        // ── Header ───────────────────────────────────────────────────────────
        doc.rect(0, 0, W, 108).fill(BRAND_DARK);

        doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(22)
           .text('MENAHARIA PLC', 40, 20, { width: W - 80 });
        doc.fillColor(BRAND_GOLD).font('Helvetica').fontSize(9.5)
           .text('Official Transport Service  •  ☎ +251920839188', 40, 47, { width: W - 80 });
        doc.rect(40, 64, W - 80, 1.5).fill(BRAND_GOLD);
        doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(12.5)
           .text('BOARDING TICKET', 40, 74, { width: W - 80 });

        // ── Route banner ─────────────────────────────────────────────────────
        const ROUTE_TOP = 108;
        doc.rect(0, ROUTE_TOP, W, 52).fill(BRAND_GOLD);

        const ORIGIN = ctx.route.origin.toUpperCase();
        const DEST   = ctx.route.destination.toUpperCase();

        doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(14)
           .text(ORIGIN, 44, ROUTE_TOP + 11, { width: 190 });
        doc.fillColor(BRAND_DARK).font('Helvetica').fontSize(18)
           .text('→', 0, ROUTE_TOP + 10, { align: 'center', width: W });
        doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(14)
           .text(DEST, W - 234, ROUTE_TOP + 11, { width: 190, align: 'right' });
        doc.fillColor(BRAND_DARK).font('Helvetica').fontSize(7.5)
           .text(`${ctx.route.distance} km`, 0, ROUTE_TOP + 35, { align: 'center', width: W });

        // ── Main card ─────────────────────────────────────────────────────────
        const CT  = ROUTE_TOP + 52 + 12;   // card top    = 172
        const CL  = 24;                     // card left
        const CW  = W - 48;                 // card width  ≈ 547
        const CH  = 462;                    // card height

        doc.roundedRect(CL, CT, CW, CH, 10).fill(WHITE);

        // Column geometry
        const IX  = CL + 22;               // info column x
        const IW  = 326;                    // info column width
        const DVX = IX + IW + 10;          // vertical divider x  ≈ 358
        const QX  = DVX + 16;              // QR column x         ≈ 374
        const QCW = CL + CW - 12 - QX;    // QR column width     ≈ 137

        // ── STAMP — full-card centred watermark (drawn first) ─────────────────
        const SS   = 210;                   // stamp size
        const SCX  = CL + CW / 2 - SS / 2; // centred horizontally in card
        const SCY  = CT + CH / 2 - SS / 2; // centred vertically in card
        if (stampBuffer.length > 0) {
          doc.save();
          (doc as any).fillOpacity(0.09);
          doc.image(stampBuffer, SCX, SCY, { width: SS, height: SS });
          doc.restore();
        }

        // ── Left column: content ──────────────────────────────────────────────
        const dep = new Date(ctx.departureTime);
        const arr = new Date(ctx.arrivalTime);
        let Y = CT + 20;

        // Passenger
        this.pdfSection(doc, 'PASSENGER DETAILS', Y, IX);
        Y += 16;
        this.pdfInfoRow(doc, 'Name',  ticket.traveler.fullName, Y, IX, IW);  Y += 17;
        this.pdfInfoRow(doc, 'Email', ticket.traveler.email,    Y, IX, IW);  Y += 17;
        this.pdfInfoRow(doc, 'Phone', ticket.traveler.phone,    Y, IX, IW);  Y += 20;
        this.pdfDivider(doc, Y, IX, IW); Y += 12;

        // Travel
        this.pdfSection(doc, 'TRAVEL DETAILS', Y, IX);
        Y += 16;
        this.pdfInfoRow(doc, 'Date',      dep.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }), Y, IX, IW); Y += 17;
        this.pdfInfoRow(doc, 'Departure', dep.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), Y, IX, IW); Y += 17;
        this.pdfInfoRow(doc, 'Arrival',   arr.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), Y, IX, IW); Y += 17;
        this.pdfInfoRow(doc, 'Distance',  `${ctx.route.distance} km`, Y, IX, IW); Y += 17;
        this.pdfInfoRow(doc, 'Bus',       ctx.plateNumber,             Y, IX, IW); Y += 20;
        this.pdfDivider(doc, Y, IX, IW); Y += 12;

        // Seat
        this.pdfSection(doc, 'SEAT ASSIGNMENT', Y, IX);
        Y += 14;
        if (seat) {
          const isVip = seat.seatType === 'VIP';
          doc.roundedRect(IX, Y, 94, 42, 6).fill(BRAND_DARK);
          doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7.5)
             .text('SEAT', IX, Y + 6, { width: 94, align: 'center' });
          doc.fillColor(BRAND_GOLD).font('Helvetica-Bold').fontSize(17)
             .text(seat.seatNumber, IX, Y + 18, { width: 94, align: 'center' });
          doc.roundedRect(IX + 110, Y, 82, 42, 6).fill(isVip ? BRAND_GOLD : BRAND_LIGHT_BG);
          doc.fillColor(isVip ? BRAND_DARK : TEXT_MUTED).font('Helvetica-Bold').fontSize(7.5)
             .text('CLASS', IX + 110, Y + 6, { width: 82, align: 'center' });
          doc.fillColor(isVip ? BRAND_DARK : TEXT_DARK).font('Helvetica-Bold').fontSize(13)
             .text(seat.seatType, IX + 110, Y + 20, { width: 82, align: 'center' });
        } else {
          doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(9)
             .text('No seat assigned', IX, Y + 6);
        }
        Y += 56;
        this.pdfDivider(doc, Y, IX, IW); Y += 12;

        // Booking reference
        this.pdfSection(doc, 'BOOKING REFERENCE', Y, IX);
        Y += 16;
        doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(13)
           .text(ctx.bookingReference, IX, Y);
        Y += 20;
        this.pdfInfoRow(doc, 'Ticket No.', ticket.ticketNumber, Y, IX, IW); Y += 17;
        doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(11)
           .text(`ETB ${ctx.totalAmount.toFixed(2)}`, IX, Y);

        // ── Vertical dashed divider ───────────────────────────────────────────
        doc.moveTo(DVX, CT + 20).lineTo(DVX, CT + CH - 20)
           .dash(4, { space: 3 }).strokeColor(DIVIDER).lineWidth(0.8).stroke();
        doc.undash();

        // ── Right column: QR code ─────────────────────────────────────────────
        const QR_SIZE = 130;
        const QR_X    = QX + (QCW - QR_SIZE) / 2;
        const QR_Y    = CT + (CH - QR_SIZE - 56) / 2 + 10; // slightly above-centre

        // "SCAN TO VERIFY" label above QR
        doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(7)
           .text('SCAN TO VERIFY', QX, QR_Y - 18, { width: QCW, align: 'center' });

        // QR image
        if (qrBuffer.length > 0) {
          doc.image(qrBuffer, QR_X, QR_Y, { width: QR_SIZE, height: QR_SIZE });
        }

        // Ticket number below QR
        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(6)
           .text('TICKET NO.', QX, QR_Y + QR_SIZE + 7, { width: QCW, align: 'center' });
        doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(6.5)
           .text(ticket.ticketNumber, QX, QR_Y + QR_SIZE + 17, { width: QCW, align: 'center' });
        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(6)
           .text(new Date(ticket.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                 QX, QR_Y + QR_SIZE + 29, { width: QCW, align: 'center' });

        // ── Tear line ─────────────────────────────────────────────────────────
        const TEAR_Y = CT + CH + 14;
        doc.moveTo(24, TEAR_Y).lineTo(W - 24, TEAR_Y)
           .dash(5, { space: 3.5 }).strokeColor('#c4cdd6').lineWidth(0.8).stroke();
        doc.undash();
        doc.fillColor('#9ca3af').font('Helvetica').fontSize(7)
           .text('✂  DETACH AT BOARDING  ✂', 0, TEAR_Y - 9, { align: 'center', width: W });

        // ── Footer ────────────────────────────────────────────────────────────
        const FY = TEAR_Y + 14;
        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(7.5).text(
          'This ticket is valid for the specified passenger, date and route only. ' +
          'Present at boarding. For support: +251920839188',
          40, FY, { align: 'center', width: W - 80 },
        );
        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(6.5)
           .text(`© ${new Date().getFullYear()} Menaharia PLC — All rights reserved`, 0, FY + 20, { align: 'center', width: W });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ─── PDF helpers ─────────────────────────────────────────────────────────────

  private pdfSection(doc: any, label: string, y: number, x: number) {
    doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(7.5).text(label, x, y);
  }

  private pdfInfoRow(doc: any, label: string, value: string, y: number, x: number, colW: number) {
    const VALUE_X = x + 90;
    doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(8).text(label, x, y, { width: 86 });
    doc.fillColor(TEXT_DARK).font('Helvetica').fontSize(8).text(value ?? 'N/A', VALUE_X, y, { width: colW - 90 });
  }

  /** @deprecated kept for legacy callers; use pdfInfoRow */
  private pdfRow(doc: any, label: string, value: string, y: number, cardLeft: number) {
    this.pdfInfoRow(doc, label, value, y, cardLeft + 20, 450);
  }

  private pdfDivider(doc: any, y: number, x: number, width: number) {
    doc.moveTo(x, y).lineTo(x + width, y).strokeColor(DIVIDER).lineWidth(0.5).stroke();
  }

  // ─── Stamp helpers ────────────────────────────────────────────────────────────

  private async loadStampBuffer(size: number): Promise<Buffer> {
    try {
      const svgContent = fs.readFileSync(this.stampPath, 'utf-8');
      return await new Promise<Buffer>((resolve, reject) => {
        svg2img(svgContent, { width: size, height: size }, (err: any, buf: Buffer) => {
          if (err) reject(err);
          else resolve(buf);
        });
      });
    } catch (err) {
      this.logger.warn(`Could not load stamp: ${err?.message ?? err}`);
      return Buffer.alloc(0);
    }
  }

  // ─── Ticket number ────────────────────────────────────────────────────────────

  private buildTicketNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `TKT-${ts}-${rand}`;
  }
}
