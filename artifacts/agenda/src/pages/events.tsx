import { useState } from "react";
import { useListEvents, useListCategories } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { EventCard } from "@/components/event-card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, CalendarX } from "lucide-react";
import { EventImportance } from "@workspace/api-client-react";
import { useTranslation } from "react-i18next";

export default function EventsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [importance, setImportance] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  const { data: events, isLoading } = useListEvents({
    importance: importance !== "all" ? (importance as any) : undefined,
    categoryId: category !== "all" ? Number(category) : undefined,
  });

  const { data: categories } = useListCategories();

  const filteredEvents = events?.filter(event =>
    search ? event.title.toLowerCase().includes(search.toLowerCase()) ||
             event.description?.toLowerCase().includes(search.toLowerCase())
           : true
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-end">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight">{t("events.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("events.subtitle")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-card p-4 rounded-xl shadow-sm border border-border/50">
          <div className="space-y-1.5">
            <Label htmlFor="search">{t("events.search")}</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder={t("events.searchPlaceholder")}
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{t("events.importance")}</Label>
            <Select value={importance} onValueChange={setImportance}>
              <SelectTrigger className="bg-background" data-testid="select-filter-importance">
                <SelectValue placeholder={t("events.allLevels")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("events.allLevels")}</SelectItem>
                <SelectItem value={EventImportance.critical}>{t("importance.critical")}</SelectItem>
                <SelectItem value={EventImportance.high}>{t("importance.high")}</SelectItem>
                <SelectItem value={EventImportance.medium}>{t("importance.medium")}</SelectItem>
                <SelectItem value={EventImportance.low}>{t("importance.low")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t("events.category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-background" data-testid="select-filter-category">
                <SelectValue placeholder={t("events.allCategories")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("events.allCategories")}</SelectItem>
                {categories?.map(cat => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
          ) : filteredEvents?.length ? (
            <div className="grid gap-4">
              {filteredEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-card rounded-xl border border-dashed border-border/50">
              <div className="w-16 h-16 mx-auto bg-muted rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                <CalendarX className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold">{t("events.noEventsFound")}</h3>
              <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                {t("events.adjustFilters")}
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
