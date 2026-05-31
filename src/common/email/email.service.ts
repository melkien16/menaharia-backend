import { BadRequestException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import type { SentMessageInfo } from 'nodemailer';
import { MessageTypeEnum } from 'src/common/enums/shared/message-types.enum';

export type SendEmailInput = {
  to: string | string[];
  type: MessageTypeEnum | string;
  payload?: Record<string, any>;
  subject?: string;
  html?: string;
  text?: string;
  replyTo?: string;
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