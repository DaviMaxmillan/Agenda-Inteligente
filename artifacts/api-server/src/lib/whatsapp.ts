import { logger } from "./logger";

interface SendWhatsAppOptions {
  to: string;
  message: string;
  accountSid: string;
  authToken: string;
  from: string;
}

interface SendResult {
  success: boolean;
  message: string;
}

export async function sendWhatsApp(opts: SendWhatsAppOptions): Promise<SendResult> {
  const { to, message, accountSid, authToken, from } = opts;

  const toFormatted = to.startsWith("whatsapp:") ? to : `whatsapp:${to}`;
  const fromFormatted = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const body = new URLSearchParams({
    To: toFormatted,
    From: fromFormatted,
    Body: message,
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error({ status: response.status, errorData }, "Twilio API error");
      return {
        success: false,
        message: `Erro ao enviar mensagem: ${(errorData as { message?: string }).message ?? response.statusText}`,
      };
    }

    return { success: true, message: "Mensagem enviada com sucesso!" };
  } catch (err) {
    logger.error({ err }, "Failed to send WhatsApp message");
    return { success: false, message: "Falha na conexão com a API do Twilio." };
  }
}
