import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LANGUAGES = [
  { code: "pt-BR", label: "Português (Brasil)", flag: "🇧🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const currentLang = LANGUAGES.find(
    (l) => l.code === i18n.language || i18n.language.startsWith(l.code.split("-")[0])
  ) ?? LANGUAGES[0];

  return (
    <Select
      value={currentLang.code}
      onValueChange={(code) => i18n.changeLanguage(code)}
    >
      <SelectTrigger
        className="w-full gap-2 bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground text-sm"
        data-testid="select-language"
      >
        <Globe className="w-4 h-4 shrink-0" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
