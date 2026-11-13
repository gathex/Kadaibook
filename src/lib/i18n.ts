import en from "@/messages/en.json";
import ta from "@/messages/ta.json";

export type Locale = "en" | "ta";
export type Messages = typeof en;

export const LOCALE_COOKIE = "kadaibook_lang";

const dictionaries: Record<Locale, Messages> = {
  en,
  ta,
};

export function normalizeLocale(value: string | undefined | null): Locale {
  return value === "ta" ? "ta" : "en";
}

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale] ?? en;
}

export function formatPaymentMode(messages: Messages, mode: string): string {
  const upper = mode.toUpperCase();
  if (upper === "CASH") return messages.paymentModes.CASH;
  if (upper === "UPI") return messages.paymentModes.UPI;
  if (upper === "UDHAAR") return messages.paymentModes.UDHAAR;
  return mode;
}
