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
        const doc = new PDFDocument({ 
          size: 'A4', 
          margin: 0, 
          info: { Title: `Ticket ${ticket.ticketNumber}`, Author: 'Menaharia PLC' } 
        });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const W = 595.28;

        // ── Page background (Clean, Professional Minimalist) ─────────────────
        doc.rect(0, 0, W, 841.89).fill(BRAND_LIGHT_BG);

        // ── Top Elegant Header Accent Line ────────────────────────────────────
        doc.rect(0, 0, W, 6).fill(BRAND_DARK);

        // ── Corporate Header ─────────────────────────────────────────────────
        doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(20)
           .text('MENAHARIA PLC', 40, 32);
        
        doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(7.5)
           .text('EXPRESS INTERCITY TRANSPORT', 40, 54, { characterSpacing: 1 });
           
        doc.fillColor(TEXT_DARK).font('Helvetica').fontSize(8.5)
           .text('☎ +251 920 839 188  •  support@menaharia.com', 40, 66);

        // ── Document Meta (Top Right Align) ──────────────────────────────────
        doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(14)
           .text('BOARDING PASS', W - 240, 32, { width: 200, align: 'right' });
        
        doc.fillColor(BRAND_GOLD).font('Helvetica-Bold').fontSize(9)
           .text(`REF: ${ctx.bookingReference}`, W - 240, 50, { width: 200, align: 'right' });

        // ── Route Banner (High-Class Journey Ribbon) ─────────────────────────
        const ROUTE_TOP = 96;
        doc.rect(40, ROUTE_TOP, W - 80, 56).fill(BRAND_DARK);
        
        // Dynamic Design Accents inside Route Banner
        doc.rect(40, ROUTE_TOP, 4, 56).fill(BRAND_GOLD);

        const ORIGIN = ctx.route.origin.toUpperCase();
        const DEST   = ctx.route.destination.toUpperCase();

        doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(15)
           .text(ORIGIN, 60, ROUTE_TOP + 14, { width: 180 });
        doc.fillColor(BRAND_GOLD).font('Helvetica').fontSize(8)
           .text('DEPARTURE STATION', 60, ROUTE_TOP + 34);

        // Center Connection Graphic
        doc.fillColor(BRAND_GOLD).font('Helvetica-Bold').fontSize(14)
           .text('━━━━  ▶  ━━━━', 0, ROUTE_TOP + 15, { align: 'center', width: W });
        doc.fillColor(WHITE).font('Helvetica').fontSize(8)
           .text(`${ctx.route.distance} KM`, 0, ROUTE_TOP + 34, { align: 'center', width: W });

        doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(15)
           .text(DEST, W - 240, ROUTE_TOP + 14, { width: 180, align: 'right' });
        doc.fillColor(BRAND_GOLD).font('Helvetica').fontSize(8)
           .text('ARRIVAL STATION', W - 240, ROUTE_TOP + 34, { width: 180, align: 'right' });

        // ── Main Pass Container Card ─────────────────────────────────────────
        const CT  = 168;                    // Card top
        const CL  = 40;                     // Card left (Aligned perfectly with header)
        const CW  = W - 80;                 // Card width
        const CH  = 470;                    // Card height

        // White base shadow background simulation
        doc.roundedRect(CL + 1, CT + 2, CW, CH, 6).fill('#e2e8f0');
        doc.roundedRect(CL, CT, CW, CH, 6).fill(WHITE);

        // Column geometry
        const IX  = CL + 24;                // Information column x
        const IW  = 300;                    // Information column width
        const DVX = CL + 340;               // Vertical secure divider x
        const QX  = DVX + 20;               // QR column x
        const QCW = (CL + CW) - QX - 24;    // QR column width

        // ── STAMP Watermark (Centred in left section for maximum professional balance) ──
        const SS   = 180;
        const SCX  = IX + (IW / 2) - (SS / 2);
        const SCY  = CT + (CH / 2) - (SS / 2);
        if (stampBuffer.length > 0) {
          doc.save();
          (doc as any).fillOpacity(0.06);
          doc.image(stampBuffer, SCX, SCY, { width: SS, height: SS });
          doc.restore();
        }

        // ── Left Column: Structural Content Layout ───────────────────────────
        const dep = new Date(ctx.departureTime);
        const arr = new Date(ctx.arrivalTime);
        let Y = CT + 24;

        // Section: Passenger
        this.pdfSection(doc, 'PASSENGER MANIFEST', Y, IX);
        Y += 16;
        this.pdfInfoRow(doc, 'PRIMARY TRAVELER', ticket.traveler.fullName, Y, IX, IW);  Y += 18;
        this.pdfInfoRow(doc, 'EMAIL ADDRESS',    ticket.traveler.email,    Y, IX, IW);  Y += 18;
        this.pdfInfoRow(doc, 'CONTACT PHONE',    ticket.traveler.phone,    Y, IX, IW);  Y += 22;
        this.pdfDivider(doc, Y, IX, IW); Y += 14;

        // Section: Schedule
        this.pdfSection(doc, 'ITINERARY & TIMINGS', Y, IX);
        Y += 16;
        this.pdfInfoRow(doc, 'JOURNEY DATE',    dep.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }), Y, IX, IW); Y += 18;
        this.pdfInfoRow(doc, 'DEPARTURE TIME',  dep.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), Y, IX, IW); Y += 18;
        this.pdfInfoRow(doc, 'ESTIMATED ARRIVAL', arr.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), Y, IX, IW); Y += 18;
        this.pdfInfoRow(doc, 'FLEET ASSIGNMENT', `PLATE NO: ${ctx.plateNumber}`, Y, IX, IW); Y += 22;
        this.pdfDivider(doc, Y, IX, IW); Y += 14;

        // Section: Seat Geometry Block
        this.pdfSection(doc, 'ACCOMMODATION & CLASS', Y, IX);
        Y += 14;
        if (seat) {
          const isVip = seat.seatType === 'VIP';
          
          // Seat Unit Block
          doc.roundedRect(IX, Y, 100, 46, 4).fill(BRAND_DARK);
          doc.fillColor(BRAND_GOLD).font('Helvetica-Bold').fontSize(7)
             .text('ASSIGNED SEAT', IX, Y + 8, { width: 100, align: 'center', characterSpacing: 0.5 });
          doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(18)
             .text(seat.seatNumber, IX, Y + 18, { width: 100, align: 'center' });

          // Class Unit Block
          doc.roundedRect(IX + 112, Y, 100, 46, 4).fill(isVip ? BRAND_GOLD : BRAND_LIGHT_BG);
          doc.fillColor(isVip ? BRAND_DARK : TEXT_MUTED).font('Helvetica-Bold').fontSize(7)
             .text('TRAVEL CLASS', IX + 112, Y + 8, { width: 100, align: 'center', characterSpacing: 0.5 });
          doc.fillColor(isVip ? WHITE : TEXT_DARK).font('Helvetica-Bold').fontSize(14)
             .text(seat.seatType, IX + 112, Y + 19, { width: 100, align: 'center' });
        } else {
          doc.roundedRect(IX, Y, 212, 46, 4).fill(BRAND_LIGHT_BG);
          doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(9)
             .text('STANDBY / NO SEAT ASSIGNED', IX, Y + 18, { width: 212, align: 'center' });
        }
        Y += 60;
        this.pdfDivider(doc, Y, IX, IW); Y += 14;

        // Section: Billing & Ledger Reference
        this.pdfSection(doc, 'TRANSACTION VERIFICATION', Y, IX);
        Y += 16;
        this.pdfInfoRow(doc, 'TICKET NUMBER', ticket.ticketNumber, Y, IX, IW); Y += 18;
        this.pdfInfoRow(doc, 'BOOKING STATUS', 'CONFIRMED / PAID', Y, IX, IW); Y += 18;
        
        // Total Fare Showcase
        doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(7.5).text('TOTAL FARE', IX, Y + 2);
        doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(14)
           .text(`ETB ${ctx.totalAmount.toFixed(2)}`, IX + 90, Y - 2);

        // ── Vertical Security Divider ─────────────────────────────────────────
        doc.save();
        doc.moveTo(DVX, CT + 16).lineTo(DVX, CT + CH - 16)
           .dash(3, { space: 3 }).strokeColor(DIVIDER).lineWidth(1).stroke();
        doc.restore();

        // ── Right Column: Secure Verification (Gate Scan Zone) ────────────────
        const QR_SIZE = 124;
        const QR_X    = QX + (QCW - QR_SIZE) / 2;
        const QR_Y    = CT + 45;

        // Enclosed Container Boundary Box for QR Code
        doc.roundedRect(QX, CT + 20, QCW, 190, 4).lineWidth(0.5).strokeColor(DIVIDER).stroke();
        doc.rect(QX, CT + 20, QCW, 18).fill(BRAND_LIGHT_BG);
        
        doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(6.5)
           .text('SECURE DIGITAL VALIDATION', QX, CT + 26, { width: QCW, align: 'center', characterSpacing: 0.5 });

        // Insert System Generated QR
        if (qrBuffer.length > 0) {
          doc.image(qrBuffer, QR_X, QR_Y, { width: QR_SIZE, height: QR_SIZE });
        }

        // Operational Tracking Strings
        doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(6)
           .text('SYSTEM DIGITAL SIGNATURE', QX, CT + 182, { width: QCW, align: 'center' });
        doc.fillColor(TEXT_DARK).font('Helvetica').fontSize(6.5)
           .text(ticket.ticketNumber, QX, CT + 192, { width: QCW, align: 'center' });

        // High contrast manifest box details for boarding handlers
        const AS_Y = CT + 235;
        doc.roundedRect(QX, AS_Y, QCW, 210, 4).fill(BRAND_LIGHT_BG);
        
        doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(7)
           .text('GATE VALIDATION MANIFEST', QX + 12, AS_Y + 14);
           
        this.pdfRightManifestRow(doc, 'ROUTE REF', `${ctx.route.origin.substring(0,3)}-${ctx.route.destination.substring(0,3)}`, AS_Y + 32, QX + 12, QCW - 24);
        this.pdfRightManifestRow(doc, 'GATE DEPART', dep.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), AS_Y + 54, QX + 12, QCW - 24);
        this.pdfRightManifestRow(doc, 'SEAT ASSIGN', seat ? seat.seatNumber : 'N/A', AS_Y + 76, QX + 12, QCW - 24);
        this.pdfRightManifestRow(doc, 'CLASS LEVEL', seat ? seat.seatType : 'N/A', AS_Y + 98, QX + 12, QCW - 24);
        
        const issueDateStr = new Date(ticket.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        this.pdfRightManifestRow(doc, 'ISSUED DATE', issueDateStr, AS_Y + 120, QX + 12, QCW - 24);

        // Security barcode boundary background accent
        doc.rect(QX + 12, AS_Y + 148, QCW - 24, 48).fill(WHITE);
        doc.roundedRect(QX + 12, AS_Y + 148, QCW - 24, 48, 2).lineWidth(0.5).strokeColor(DIVIDER).stroke();
        
        // Mocking an enterprise security vector pattern string inside barcode box
        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(5.5)
           .text('MNR-SECURE-PROTOCOL-V26//' + ticket.qrCode.replace(/\|/g, '-'), QX + 16, AS_Y + 156, { width: QCW - 32, align: 'center' });
        doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(7.5)
           .text('★ VALID SYSTEM RECORD ★', QX + 16, AS_Y + 176, { width: QCW - 32, align: 'center', characterSpacing: 0.5 });

        // ── Security Tear Line (Perforation styling) ─────────────────────────
        const TEAR_Y = CT + CH + 24;
        doc.save();
        doc.moveTo(40, TEAR_Y).lineTo(W - 40, TEAR_Y)
           .dash(4, { space: 4 }).strokeColor('#94a3b8').lineWidth(1).stroke();
        doc.restore();
        
        doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(6.5)
           .text('✂   DETACHABLE MANIFEST STUB — PRESENT VALID IDENTIFICATION UPON BOARDING   ✂', 0, TEAR_Y - 3.5, { align: 'center', width: W, characterSpacing: 0.5 });

        // ── Executive Footer ──────────────────────────────────────────────────
        const FY = TEAR_Y + 18;
        doc.fillColor(TEXT_MUTED).font('Helvetica').fontSize(7.5).text(
          'Terms & Conditions: This electronic document is non-transferable and valid solely for the scheduled departure itinerary details noted herein. ' +
          'Passengers are required to check-in 30 minutes prior to scheduled departure. For systemic tier customer infrastructure inquiries, contact support.',
          40, FY, { align: 'center', width: W - 80, lineGap: 2 },
        );
        
        doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(7)
           .text(`© ${new Date().getFullYear()} MENAHARIA PLC. ARCHITECTURAL PLATFORM INFRASTRUCTURE. ALL RIGHTS RESERVED.`, 0, FY + 32, { align: 'center', width: W, characterSpacing: 0.2 });

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ─── PDF helpers ─────────────────────────────────────────────────────────────

  private pdfSection(doc: any, label: string, y: number, x: number) {
    doc.fillColor(BRAND_DARK).font('Helvetica-Bold').fontSize(8).text(label, x, y, { characterSpacing: 0.5 });
  }

  private pdfInfoRow(doc: any, label: string, value: string, y: number, x: number, colW: number) {
    const VALUE_X = x + 105;
    doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(7).text(label, x, y + 1, { width: 100 });
    doc.fillColor(TEXT_DARK).font('Helvetica').fontSize(8.5).text(value ?? 'N/A', VALUE_X, y, { width: colW - 105 });
  }

  private pdfRightManifestRow(doc: any, label: string, value: string, y: number, x: number, width: number) {
    doc.fillColor(TEXT_MUTED).font('Helvetica-Bold').fontSize(6.5).text(label, x, y);
    doc.fillColor(TEXT_DARK).font('Helvetica-Bold').fontSize(8).text(value ?? 'N/A', x, y, { align: 'right', width: width });
  }

  /** @deprecated kept for legacy callers; use pdfInfoRow */
  private pdfRow(doc: any, label: string, value: string, y: number, cardLeft: number) {
    this.pdfInfoRow(doc, label, value, y, cardLeft + 20, 450);
  }

  private pdfDivider(doc: any, y: number, x: number, width: number) {
    doc.moveTo(x, y).lineTo(x + width, y).strokeColor(DIVIDER).lineWidth(0.75).stroke();
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
