import { useTranslation } from "react-i18next";
import { ptBR, enUS, es } from "date-fns/locale";
import type { Locale } from "date-fns";

export function useDateLocale(): Locale {
  const { i18n } = useTranslation();
  const lang = i18n.language;

  if (lang === "pt-BR" || lang.startsWith("pt")) return ptBR;
  if (lang === "es" || lang.startsWith("es")) return es;
  return enUS;
}
