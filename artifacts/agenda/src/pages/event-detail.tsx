import { useRoute, useLocation, Link } from "wouter";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft, Calendar as CalendarIcon, Clock, Trash2,
  MessageSquare, FileText, CheckCircle2
} from "lucide-react";
import {
  useGetEvent, useDeleteEvent,
  getListEventsQueryKey, getGetTodayEventsQueryKey,
  getGetUpcomingEventsQueryKey, getGetEventsSummaryQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportanceBadge } from "@/components/importance-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks/use-date-locale";
import { EventAttachments } from "@/components/event-attachments";

export default function EventDetailPage() {
  const { t } = useTranslation();
  const locale = useDateLocale();
  const [, params] = useRoute("/events/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useGetEvent(id, {
    query: {
      enabled: !!id,
      queryKey: ["/api/events", id] as any
    }
  });

  const deleteEvent = useDeleteEvent();

  const handleDelete = () => {
    deleteEvent.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTodayEventsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetUpcomingEventsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetEventsSummaryQueryKey() });
          toast({ title: t("toasts.eventDeleted"), description: t("toasts.eventDeletedDesc") });
          setLocation("/events");
        },
        onError: () => {
          toast({ title: t("toasts.error"), description: t("toasts.errorDelete"), variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold">{t("eventDetail.notFound")}</h2>
          <Button variant="link" onClick={() => setLocation("/events")}>{t("eventDetail.backToEvents")}</Button>
        </div>
      </Layout>
    );
  }

  const start = parseISO(event.startAt);
  const end = event.endAt ? parseISO(event.endAt) : null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6 pb-20">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link href="/events"><ArrowLeft className="w-4 h-4" /> {t("eventDetail.back")}</Link>
          </Button>

          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2" data-testid="btn-delete-event">
                  <Trash2 className="w-4 h-4" /> {t("eventDetail.delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("eventDetail.deleteConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("eventDetail.deleteConfirmDesc", { title: event.title })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("eventDetail.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    {t("eventDetail.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Main Info */}
          <Card className="border-border/50 shadow-md overflow-hidden relative">
            <div
              className={`absolute top-0 left-0 bottom-0 w-2 ${
                event.importance === "critical" ? "bg-red-500" :
                event.importance === "high" ? "bg-orange-500" :
                event.importance === "medium" ? "bg-amber-500" :
                "bg-blue-500"
              }`}
            />
            <CardContent className="p-8 pl-10">
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start gap-3 justify-between">
                  <h1 className="text-3xl font-serif font-bold text-foreground leading-tight" data-testid="text-event-title">
                    {event.title}
                  </h1>
                  <ImportanceBadge importance={event.importance} className="text-sm px-3 py-1" />
                </div>

                <div className="flex flex-wrap items-center gap-6 text-muted-foreground mt-2">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">{format(start, "EEEE, d 'de' MMMM yyyy", { locale })}</span>
                  </div>

                  <div className="flex items-center gap-2" data-testid="text-event-time">
                    <Clock className="w-5 h-5 text-primary" />
                    <span className="font-medium text-foreground">
                      {event.allDay
                        ? t("eventDetail.allDay")
                        : `${format(start, "HH:mm")}${end ? ` ${t("eventDetail.to")} ${format(end, "HH:mm")}` : ""}`}
                    </span>
                  </div>

                  {event.categoryName && (
                    <div className="flex items-center gap-2 bg-muted/50 px-3 py-1 rounded-full border border-border/50">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.categoryColor || "hsl(var(--primary))" }} />
                      <span className="font-medium text-sm text-foreground">{event.categoryName}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <EventAttachments eventId={id} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Description */}
            <Card className="border-border/50 shadow-sm md:col-span-2">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" /> {t("eventDetail.details")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {event.description ? (
                  <div className="whitespace-pre-wrap text-foreground/80 leading-relaxed" data-testid="text-event-desc">
                    {event.description}
                  </div>
                ) : (
                  <div className="text-muted-foreground italic text-center py-8">
                    {t("eventDetail.noDescription")}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-lg font-serif flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-green-600" /> {t("eventDetail.whatsapp")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {event.whatsappNotify ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span className="font-medium text-sm">{t("eventDetail.alertActive")}</span>
                    </div>

                    <div className="space-y-3 mt-4 text-sm">
                      <div>
                        <span className="text-muted-foreground block mb-1">{t("eventDetail.sendingTo")}</span>
                        <span className="font-medium">{event.notifyPhone}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">{t("eventDetail.when")}</span>
                        <span className="font-medium">{t("eventDetail.minutesBefore", { count: event.notifyAdvanceMinutes })}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">{t("eventDetail.status")}</span>
                        {event.notificationSent ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
                            {t("eventDetail.sent")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded">
                            {t("eventDetail.pending")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground space-y-2">
                    <MessageSquare className="w-8 h-8 mx-auto opacity-20" />
                    <p className="text-sm">{t("eventDetail.notificationsDisabled")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
