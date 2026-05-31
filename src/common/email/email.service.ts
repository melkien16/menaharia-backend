import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { SentMessageInfo } from 'nodemailer';
import { MessageTypeEnum } from 'src/common/enums/shared/message-types.enum';

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

export type SendEmailInput = {
  to: string | string[];
  type: MessageTypeEnum | string;
  payload?: Record<string, any>;
  subject?: string;
  html?: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
};

export type SendEmailResult = {
  messageId: string;
  accepted: string[];
  rejected: string[];
  to: string | string[];
  subject: string;
  from: string;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transport: Transporter;
  private readonly from: string;
  private readonly replyTo?: string;
  private readonly appName: string;
  private readonly useLocalTransport: boolean;

  constructor(private readonly configService: ConfigService) {
    this.useLocalTransport =
      this.configService.get<boolean>('email.useLocalTransport') ??
      this.configService.get<string>('app.env') !== 'production';

    const host = this.configService.get<string>('email.smtpHost');
    const port = this.configService.get<number>('email.smtpPort');
    const user = this.configService.get<string>('email.smtpUser');
    const pass = this.configService.get<string>('email.smtpPass');
    const secure = this.configService.get<boolean>('email.smtpSecure') ?? false;
    const fromEmail = this.configService.get<string>('email.fromEmail');
    const fromName =
      this.configService.get<string>('email.fromName') ||
      this.configService.get<string>('app.name') ||
      'Menaharia';
    const replyTo = this.configService.get<string>('email.replyTo');

    if (!host) {
      throw new Error('SMTP_HOST is required to initialize EmailService');
    }

    if (!port) {
      throw new Error('SMTP_PORT is required to initialize EmailService');
    }

    if (!fromEmail) {
      throw new Error('EMAIL_FROM is required to initialize EmailService');
    }

    const senderEmail = user || fromEmail;

    if (this.useLocalTransport) {
      this.transport = createTransport({
        jsonTransport: true,
      });
    } else {
      this.transport = createTransport({
        host,
        port,
        secure,
        family: 4,
        auth: user && pass ? { user, pass } : undefined,
      } as any);
    }

    this.from = `${fromName} <${senderEmail}>`;
    this.replyTo = replyTo || (senderEmail !== fromEmail ? fromEmail : undefined);
    this.appName = fromName;
  }

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const recipient = this.normalizeRecipient(input.to);

    const rendered =
      input.html || input.text || input.subject
        ? {
            subject: input.subject || this.defaultSubject(input.type),
            html: input.html ?? this.renderHtml(input.type, input.payload ?? {}),
            text: input.text ?? this.renderText(input.type, input.payload ?? {}),
          }
        : this.renderTemplate(input.type, input.payload ?? {});

    if (!rendered.subject) {
      throw new BadRequestException('Email subject is required');
    }

    try {
      const info = (await this.transport.sendMail({
        from: this.from,
        to: recipient,
        replyTo: input.replyTo || this.replyTo,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        attachments: input.attachments?.map((a) => ({
          filename: a.filename,
          content: a.content,
          contentType: a.contentType,
        })),
      })) as SentMessageInfo;

      const accepted = Array.isArray(info.accepted) ? info.accepted.map(String) : [];
      const rejected = Array.isArray(info.rejected) ? info.rejected.map(String) : [];

      if (rejected.length > 0) {
        throw new InternalServerErrorException(
          `SMTP rejected recipients: ${rejected.join(', ')}`,
        );
      }

      if (!info.messageId) {
        throw new InternalServerErrorException('Email transport did not return a message id');
      }

      if (this.useLocalTransport) {
        const preview =
          typeof info.message === 'string'
            ? info.message
            : JSON.stringify(info.message ?? info);

        this.logger.log(
          `Development email payload for ${Array.isArray(recipient) ? recipient.join(', ') : recipient}: ${preview.slice(0, 500)}`,
        );
      } else {
        this.logger.log(
          `Email sent to ${Array.isArray(recipient) ? recipient.join(', ') : recipient} with id ${info.messageId}`,
        );
      }

      return {
        messageId: info.messageId,
        accepted,
        rejected,
        to: recipient,
        subject: rendered.subject,
        from: this.from,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${Array.isArray(recipient) ? recipient.join(', ') : recipient}: ${message}`);
      throw new InternalServerErrorException(`Failed to send email: ${message}`);
    }
  }

  async sendWelcomeEmail(params: { to: string; name: string }) {
    return this.sendEmail({
      to: params.to,
      type: MessageTypeEnum.WELCOME,
      payload: {
        name: params.name,
        appName: this.appName,
      },
    });
  }

  async sendBookingConfirmedEmail(params: {
    to: string;
    name?: string | null;
    bookingReference: string;
    ticketNumber: string;
  }) {
    return this.sendEmail({
      to: params.to,
      type: MessageTypeEnum.BOOKING_CONFIRMED,
      payload: {
        name: params.name || 'Customer',
        bookingReference: params.bookingReference,
        ticketNumber: params.ticketNumber,
        appName: this.appName,
      },
    });
  }

  async sendTicketEmail(params: {
    to: string;
    travelerName: string;
    bookingReference: string;
    ticketNumber: string;
    route: string;
    departureTime: Date;
    pdfBuffer: Buffer;
    pdfFilename: string;
  }) {
    const depStr = new Date(params.departureTime).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = this.wrapHtml(`
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1a3d6e;padding:28px 32px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:22px;">MENAHARIA PLC</h1>
          <p style="color:#d4a017;margin:6px 0 0;font-size:12px;">Official Transport Service</p>
        </div>
        <div style="background:#fff;padding:32px;border:1px solid #dde3ed;border-top:none;">
          <h2 style="color:#1a3d6e;margin-top:0;">Your Ticket is Confirmed!</h2>
          <p>Hello <strong>${this.escapeHtml(params.travelerName)}</strong>,</p>
          <p>Your boarding ticket for the journey below is attached to this email as a PDF.</p>

          <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px;">
            <tr style="background:#f4f7fb;">
              <td style="padding:10px 14px;color:#6b7280;width:38%;">Booking Reference</td>
              <td style="padding:10px 14px;font-weight:bold;color:#1a3d6e;">${this.escapeHtml(params.bookingReference)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;color:#6b7280;">Ticket Number</td>
              <td style="padding:10px 14px;font-weight:bold;color:#1a3d6e;">${this.escapeHtml(params.ticketNumber)}</td>
            </tr>
            <tr style="background:#f4f7fb;">
              <td style="padding:10px 14px;color:#6b7280;">Route</td>
              <td style="padding:10px 14px;">${this.escapeHtml(params.route)}</td>
            </tr>
            <tr>
              <td style="padding:10px 14px;color:#6b7280;">Departure</td>
              <td style="padding:10px 14px;">${this.escapeHtml(depStr)}</td>
            </tr>
          </table>

          <div style="background:#f4f7fb;border-left:4px solid #d4a017;padding:14px 18px;border-radius:4px;margin:24px 0;">
            <p style="margin:0;font-size:13px;color:#1f2937;">
              <strong>Please bring this ticket (printed or digital) when boarding.</strong><br/>
              The attached PDF contains your QR code for quick verification.
            </p>
          </div>

          <p style="color:#6b7280;font-size:12px;">
            For assistance, contact us at <strong>+251920839188</strong>.
          </p>
        </div>
        <div style="background:#f4f7fb;padding:14px 32px;border-radius:0 0 8px 8px;text-align:center;">
          <p style="color:#9ca3af;font-size:11px;margin:0;">
            © ${new Date().getFullYear()} Menaharia PLC — Official Transport Service
          </p>
        </div>
      </div>
    `);

    return this.sendEmail({
      to: params.to,
      type: MessageTypeEnum.BOOKING_CONFIRMED,
      subject: `Your Ticket ${params.ticketNumber} — ${params.route}`,
      html,
      attachments: [
        {
          filename: params.pdfFilename,
          content: params.pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }

  private renderTemplate(type: MessageTypeEnum | string, payload: Record<string, any>) {
    return {
      subject: this.defaultSubject(type, payload),
      html: this.renderHtml(type, payload),
      text: this.renderText(type, payload),
    };
  }

  private defaultSubject(type: MessageTypeEnum | string, payload: Record<string, any> = {}) {
    switch (type) {
      case MessageTypeEnum.WELCOME:
        return `Welcome to ${payload.appName || this.appName}`;
      case MessageTypeEnum.BOOKING_CONFIRMED:
        return `Your booking ${payload.bookingReference || ''} is confirmed`.trim();
      case MessageTypeEnum.PASSWORD_RESET:
        return `Reset your ${payload.appName || this.appName} password`;
      default:
        return payload.subject || `Message from ${payload.appName || this.appName}`;
    }
  }

  private renderHtml(type: MessageTypeEnum | string, payload: Record<string, any>) {
    switch (type) {
      case MessageTypeEnum.WELCOME:
        return this.wrapHtml(
          `<p>Welcome ${this.escapeHtml(payload.name || 'Customer')},</p><p>Your account is ready.</p>`,
        );
      case MessageTypeEnum.BOOKING_CONFIRMED:
        return this.wrapHtml(
          `<p>Hello ${this.escapeHtml(payload.name || 'Customer')},</p><p>Your booking <strong>${this.escapeHtml(payload.bookingReference || '')}</strong> is confirmed.</p><p>Ticket number: <strong>${this.escapeHtml(payload.ticketNumber || '')}</strong></p>`,
        );
      case MessageTypeEnum.PASSWORD_RESET:
        return this.wrapHtml(`<p>Hello,</p><p>Use the password reset link in your inbox.</p>`);
      default:
        return this.wrapHtml(
          `<p>${this.escapeHtml(payload.message || 'You have a new message.')}</p>`,
        );
    }
  }

  private renderText(type: MessageTypeEnum | string, payload: Record<string, any>) {
    switch (type) {
      case MessageTypeEnum.WELCOME:
        return `Welcome ${payload.name || 'Customer'}\nYour account is ready.`;
      case MessageTypeEnum.BOOKING_CONFIRMED:
        return `Hello ${payload.name || 'Customer'}\nYour booking ${payload.bookingReference || ''} is confirmed.\nTicket number: ${payload.ticketNumber || ''}`;
      case MessageTypeEnum.PASSWORD_RESET:
        return 'Use the password reset link in your inbox.';
      default:
        return payload.message || 'You have a new message.';
    }
  }

  private wrapHtml(content: string) {
    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        ${content}
      </div>
    `;
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private normalizeRecipient(to: string | string[]) {
    if (Array.isArray(to)) {
      const normalized = to.map((value) => value.trim()).filter(Boolean);

      if (normalized.length === 0) {
        throw new BadRequestException('Email recipient is required');
      }

      return normalized;
    }

    const normalized = to.trim();

    if (!normalized) {
      throw new BadRequestException('Email recipient is required');
    }

    return normalized;
  }
}