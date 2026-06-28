import { useGetEventsSummary, useGetTodayEvents, useGetUpcomingEvents } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Calendar, Bell, AlertTriangle, Clock, CalendarDays } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Layout } from "@/components/layout";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/hooks/use-date-locale";

export default function Dashboard() {
  const { t } = useTranslation();
  const locale = useDateLocale();

  const { data: summary, isLoading: loadingSummary } = useGetEventsSummary();
  const { data: todayEvents, isLoading: loadingToday } = useGetTodayEvents();
  const { data: upcomingEvents, isLoading: loadingUpcoming } = useGetUpcomingEvents();

  const today = new Date();

  return (
    <Layout>
      <div className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground tracking-tight" data-testid="text-dashboard-date">
            {format(today, "PPPP", { locale })}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t("dashboard.subtitle")}
          </p>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title={t("dashboard.today")}
            value={summary?.today}
            loading={loadingSummary}
            icon={Calendar}
            color="text-blue-600"
          />
          <StatCard
            title={t("dashboard.thisWeek")}
            value={summary?.thisWeek}
            loading={loadingSummary}
            icon={CalendarDays}
            color="text-primary"
          />
          <StatCard
            title={t("dashboard.critical")}
            value={summary?.byImportance?.critical}
            loading={loadingSummary}
            icon={AlertTriangle}
            color="text-red-600"
          />
          <StatCard
            title={t("dashboard.alertsSetup")}
            value={summary?.withNotification}
            loading={loadingSummary}
            icon={Bell}
            color="text-green-600"
          />
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Today's Events */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-semibold">{t("dashboard.today")}</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/events">{t("dashboard.viewAll")}</Link>
              </Button>
            </div>

            <div className="space-y-3">
              {loadingToday ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
              ) : todayEvents?.length ? (
                todayEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))
              ) : (
                <EmptyState
                  title={t("dashboard.noEventsToday")}
                  description={t("dashboard.scheduleIsClear")}
                  icon={Clock}
                />
              )}
            </div>
          </section>

          {/* Upcoming Events */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-serif font-semibold">{t("dashboard.upcoming")}</h2>
            </div>

            <div className="space-y-3">
              {loadingUpcoming ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
              ) : upcomingEvents?.length ? (
                upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} compact />
                ))
              ) : (
                <EmptyState
                  title={t("dashboard.noUpcomingEvents")}
                  description={t("dashboard.nothingScheduled")}
                  icon={CalendarDays}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, loading, icon: Icon, color }: any) {
  return (
    <Card className="border-border/50 shadow-sm overflow-hidden relative">
      <div className={`absolute top-0 right-0 p-4 opacity-10 ${color}`}>
        <Icon className="w-16 h-16 transform translate-x-4 -translate-y-4" />
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className={`text-3xl font-bold font-serif ${color}`}>{value ?? 0}</div>
        )}
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description, icon: Icon }: any) {
  const { t } = useTranslation();
  return (
    <Card className="border-dashed bg-muted/30">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-muted-foreground text-sm max-w-xs mt-1">{description}</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/events/new">{t("dashboard.createEvent")}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
