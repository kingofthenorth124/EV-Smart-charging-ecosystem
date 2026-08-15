import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Thin wrapper around the Resend REST API.
 *
 * In development (no RESEND_API_KEY set) the email content is logged to stdout
 * so developers can follow reset links without a real email account.
 *
 * In production a missing key is a hard failure — the error is thrown so the
 * caller can decide whether to surface it (the auth service treats this as a
 * warning and still returns 202 to avoid enumeration, but logs the failure).
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | undefined;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('email.resendApiKey');
    this.fromAddress = this.configService.get<string>(
      'email.fromAddress',
      'noreply@camel-wallet.app',
    );
  }

  async send(options: SendEmailOptions): Promise<void> {
    if (!this.apiKey) {
      if (this.configService.get<string>('nodeEnv') !== 'production') {
        this.logger.warn(
          `[DEV] Email to: ${options.to} | Subject: ${options.subject}`,
          'EmailService',
        );
        this.logger.warn(
          `[DEV] Body:\n${options.text ?? options.html}`,
          'EmailService',
        );
        return;
      }
      throw new Error(
        'RESEND_API_KEY is not configured. Cannot send email in production.',
      );
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.fromAddress,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '(no body)');
      throw new Error(
        `Resend API error ${response.status}: ${body}`,
      );
    }
  }
}
