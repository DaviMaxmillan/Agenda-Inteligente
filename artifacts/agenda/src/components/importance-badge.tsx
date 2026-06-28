import { cva, type VariantProps } from "class-variance-authority";
import { Badge } from "@/components/ui/badge";
import { EventImportance } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";

const badgeVariants = cva("font-medium", {
  variants: {
    importance: {
      low: "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100",
      medium: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
      high: "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100",
      critical: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
    },
  },
  defaultVariants: {
    importance: "low",
  },
});

interface ImportanceBadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {
  importance: EventImportance;
}

export function ImportanceBadge({ importance, className, ...props }: ImportanceBadgeProps) {
  const { t } = useTranslation();
  return (
    <Badge
      variant="outline"
      className={badgeVariants({ importance, className })}
      data-testid={`badge-importance-${importance}`}
      {...props}
    >
      {t(`importance.${importance}`)}
    </Badge>
  );
}
