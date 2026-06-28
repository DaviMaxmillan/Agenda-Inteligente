import { logger } from "./logger";

interface SendCallMeBotOptions {
  phone: string;
  apiKey: string;
  message: string;
}

interface SendResult {
  success: boolean;
  message: string;
}

export async function sendCallMeBot(opts: SendCallMeBotOptions): Promise<SendResult> {
  const { phone, apiKey, message } = opts;

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;

  try {
    const response = await fetch(url, { method: "GET" });

    const text = await response.text();

    if (!response.ok || text.toLowerCase().includes("error") || text.toLowerCase().includes("incorrect")) {
      logger.error({ status: response.status, body: text }, "CallMeBot API error");
      return { success: false, message: `Erro CallMeBot: ${text.substring(0, 120)}` };
    }

    return { success: true, message: "Mensagem enviada via CallMeBot!" };
  } catch (err) {
    logger.error({ err }, "Failed to send CallMeBot message");
    return { success: false, message: "Falha na conexão com a API CallMeBot." };
  }
}
