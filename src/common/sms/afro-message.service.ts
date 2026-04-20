import { Logger } from '@nestjs/common';

export const sendSms = async (
  phoneNumber: string,
  message: string,
  callbackUrl?: string,
): Promise<any> => {
  const logger = new Logger('SMS Service');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const afroMessageURL = process.env.AFROMESSAGE_URL || 'https://api.afromessage.com/api/send';

    const token = process.env.AFROMESSAGE_TOKEN;
    let identifier = process.env.AFROMESSAGE_IDENTIFIER_ID || null;
    let sender = process.env.AFROMESSAGE_SENDER_NAME || null;

    if (!token) {
      throw new Error('Missing AFROMESSAGE_TOKEN');
    }

    if (!identifier || !sender) {
      identifier = null;
      sender = null;
      logger.warn('SMS beta mode. AFROMESSAGE_IDENTIFIER_ID or AFROMESSAGE_SENDER_NAME not set.');
    }

    const payload: Record<string, any> = {
      to: phoneNumber,
      message,
    };

    if (identifier) payload.from = identifier;
    if (sender) payload.sender = sender;
    if (callbackUrl) payload.callback = callbackUrl;

    const response = await fetch(afroMessageURL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const rawBody = await response.text();
    let data: any = rawBody;

    try {
      data = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      data = rawBody;
    }

    if (!response.ok) {
      const errorPayload =
        typeof data === 'string' ? data : JSON.stringify(data ?? { status: response.status });
      throw new Error(`SMS error (${response.status}): ${errorPayload}`);
    }

    return data;
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`Failed to send SMS: ${err instanceof Error ? err.message : String(err)}`);
  }
};
