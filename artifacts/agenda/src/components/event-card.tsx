import { Link } from "wouter";
import { format, parseISO, isSameDay } from "date-fns";
import { Clock, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Event } from "@workspace/api-client-react";
import { ImportanceBadge } from "./importance-badge";
import { useTranslation } from "react-i18next";

interface EventCardProps {
  event: Event;
  compact?: boolean;
}

export function EventCard({ event, compact = false }: EventCardProps) {
  const { t } = useTranslation();
  const start = parseISO(event.startAt);
  const end = event.endAt ? parseISO(event.endAt) : null;

  const timeDisplay = event.allDay
    ? t("eventCard.allDay")
    : `${format(start, "HH:mm")}${end && isSameDay(start, end) ? ` - ${format(end, "HH:mm")}` : ""}`;

  return (
    <Link href={`/events/${event.id}`}>
      <Card className="hover-elevate cursor-pointer transition-all duration-200 group overflow-hidden border-border/50">
        <div className="flex h-full">
          {/* Status color bar */}
          <div
            className={`w-2 shrink-0 ${
              event.importance === "critical" ? "bg-red-500" :
              event.importance === "high" ? "bg-orange-500" :
              event.importance === "medium" ? "bg-amber-500" :
              "bg-blue-500"
            }`}
          />

          <CardContent className={`flex-1 p-4 ${compact ? "p-3" : ""}`}>
            <div className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-4">
                <h3 className={`font-serif font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2 ${compact ? "text-base" : "text-lg"}`}>
                  {event.title}
                </h3>
                <ImportanceBadge importance={event.importance} className="shrink-0" />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mt-1">
                <div className="flex items-center gap-1.5" data-testid={`text-time-${event.id}`}>
                  <Clock className="w-4 h-4" />
                  <span>{timeDisplay}</span>
                  {!event.allDay && !compact && end && !isSameDay(start, end) && (
                    <span className="text-xs ml-1 bg-muted px-1.5 py-0.5 rounded">
                      {t("eventCard.ends", { date: format(end, "d MMM") })}
                    </span>
                  )}
                </div>

                {event.categoryName && (
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: event.categoryColor || "hsl(var(--primary))" }}
                    />
                    <span className="font-medium">{event.categoryName}</span>
                  </div>
                )}

                {event.whatsappNotify && (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-500/10 px-1.5 py-0.5 rounded text-xs font-medium">
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>{t("eventCard.whatsappAlert")}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}
