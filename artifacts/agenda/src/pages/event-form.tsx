import { useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { ArrowLeft, Bell, Calendar as CalendarIcon, Clock, Phone, AlertTriangle } from "lucide-react";
import { useCreateEvent, useListCategories, useGetNotificationSettings, getListEventsQueryKey, getGetTodayEventsQueryKey, getGetUpcomingEventsQueryKey, getGetEventsSummaryQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { EventInputImportance } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

export default function EventFormPage() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories } = useListCategories();
  const { data: settings } = useGetNotificationSettings();
  const createEvent = useCreateEvent();

  const formSchema = z.object({
    title: z.string().min(1, t("eventForm.titleRequired")),
    description: z.string().optional(),
    startAtDate: z.string().min(1, t("eventForm.startDateRequired")),
    startAtTime: z.string().optional(),
    endAtDate: z.string().optional(),
    endAtTime: z.string().optional(),
    allDay: z.boolean().default(false),
    importance: z.nativeEnum(EventInputImportance),
    categoryId: z.string().optional(),
    whatsappNotify: z.boolean().default(false),
    notifyPhone: z.string().optional(),
    notifyAdvanceMinutes: z.string().optional(),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      startAtDate: format(new Date(), "yyyy-MM-dd"),
      startAtTime: "09:00",
      endAtDate: "",
      endAtTime: "",
      allDay: false,
      importance: EventInputImportance.low,
      categoryId: "none",
      whatsappNotify: false,
      notifyPhone: "",
      notifyAdvanceMinutes: "15",
    },
  });

  const watchAllDay = form.watch("allDay");
  const watchWhatsapp = form.watch("whatsappNotify");

  useEffect(() => {
    if (settings?.defaultPhone && !form.getValues("notifyPhone")) {
      form.setValue("notifyPhone", settings.defaultPhone);
    }
  }, [settings, form]);

  function onSubmit(values: FormValues) {
    const startDateTime = values.allDay
      ? new Date(`${values.startAtDate}T00:00:00`).toISOString()
      : new Date(`${values.startAtDate}T${values.startAtTime || "00:00"}:00`).toISOString();

    let endDateTime = undefined;
    if (values.endAtDate) {
      endDateTime = values.allDay
        ? new Date(`${values.endAtDate}T23:59:59`).toISOString()
        : new Date(`${values.endAtDate}T${values.endAtTime || "23:59"}:00`).toISOString();
    }

    createEvent.mutate(
      {
        data: {
          title: values.title,
          description: values.description || undefined,
          startAt: startDateTime,
          endAt: endDateTime || null,
          allDay: values.allDay,
          importance: values.importance,
          categoryId: values.categoryId !== "none" && values.categoryId ? parseInt(values.categoryId, 10) : null,
          whatsappNotify: values.whatsappNotify,
          notifyPhone: values.whatsappNotify ? values.notifyPhone : null,
          notifyAdvanceMinutes: values.whatsappNotify && values.notifyAdvanceMinutes ? parseInt(values.notifyAdvanceMinutes, 10) : null,
        },
      },
      {
        onSuccess: (event) => {
          queryClient.invalidateQueries({ queryKey: getListEventsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTodayEventsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetUpcomingEventsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetEventsSummaryQueryKey() });
          toast({ title: t("toasts.eventCreated"), description: t("toasts.eventCreatedDesc") });
          setLocation(`/events/${event.id}`);
        },
        onError: () => {
          toast({ title: t("toasts.error"), description: t("toasts.errorCreate"), variant: "destructive" });
        },
      }
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link href="/events"><ArrowLeft className="w-5 h-5" /></Link>
          </Button>
          <h1 className="text-3xl font-serif font-bold tracking-tight">{t("eventForm.newEvent")}</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-lg">{t("eventForm.eventTitle")}</FormLabel>
                      <FormControl>
                        <Input placeholder={t("eventForm.titlePlaceholder")} className="text-lg py-6" data-testid="input-title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("eventForm.category")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder={t("eventForm.selectCategory")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">{t("eventForm.noCategory")}</SelectItem>
                            {categories?.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                  {cat.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="importance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("eventForm.importance")}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-importance">
                              <SelectValue placeholder={t("eventForm.selectLevel")} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={EventInputImportance.low}>{t("importance.low")}</SelectItem>
                            <SelectItem value={EventInputImportance.medium}>{t("importance.medium")}</SelectItem>
                            <SelectItem value={EventInputImportance.high}>{t("importance.high")}</SelectItem>
                            <SelectItem value={EventInputImportance.critical}>{t("importance.critical")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("eventForm.notes")}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t("eventForm.notesPlaceholder")}
                          className="min-h-[120px] resize-none"
                          data-testid="input-description"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-lg font-serif font-medium border-b border-border pb-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  <h2>{t("eventForm.dateTime")}</h2>
                </div>

                <FormField
                  control={form.control}
                  name="allDay"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/20">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t("eventForm.allDay")}</FormLabel>
                        <FormDescription>{t("eventForm.allDayDesc")}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-allday"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="startAtDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("eventForm.startDate")}</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-start-date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {!watchAllDay && (
                      <FormField
                        control={form.control}
                        name="startAtTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("eventForm.startTime")}</FormLabel>
                            <FormControl>
                              <Input type="time" data-testid="input-start-time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="endAtDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("eventForm.endDate")}</FormLabel>
                          <FormControl>
                            <Input type="date" data-testid="input-end-date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {!watchAllDay && (
                      <FormField
                        control={form.control}
                        name="endAtTime"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("eventForm.endTime")}</FormLabel>
                            <FormControl>
                              <Input type="time" data-testid="input-end-time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`border-border/50 shadow-sm overflow-hidden transition-colors ${watchWhatsapp ? "border-green-200 dark:border-green-900 bg-green-50/30 dark:bg-green-900/10" : ""}`}>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-2 text-lg font-serif font-medium border-b border-border/50 pb-2">
                  <Bell className={`w-5 h-5 ${watchWhatsapp ? "text-green-600" : "text-muted-foreground"}`} />
                  <h2>{t("eventForm.whatsappSection")}</h2>
                </div>

                {settings && !settings.isConfigured && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-lg flex items-start gap-3 text-amber-800 dark:text-amber-200">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold">{t("eventForm.whatsappNotConfigured")}</p>
                      <p className="mt-1">{t("eventForm.whatsappNotConfiguredDesc")}</p>
                      <Button variant="link" size="sm" asChild className="p-0 h-auto text-amber-800 dark:text-amber-200 font-semibold underline mt-2">
                        <Link href="/settings">{t("eventForm.configureSettings")}</Link>
                      </Button>
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="whatsappNotify"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border border-border/50 p-4 bg-background">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">{t("eventForm.enableAlert")}</FormLabel>
                        <FormDescription>{t("eventForm.enableAlertDesc")}</FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-whatsapp"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {watchWhatsapp && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 animate-in fade-in slide-in-from-top-4">
                    <FormField
                      control={form.control}
                      name="notifyPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("eventForm.phoneNumber")}</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input placeholder={t("eventForm.phonePlaceholder")} className="pl-9" data-testid="input-phone" {...field} />
                            </div>
                          </FormControl>
                          <FormDescription>{t("eventForm.phoneDesc")}</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notifyAdvanceMinutes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("eventForm.notifyMe")}</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-advance-time">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <SelectValue placeholder={t("eventForm.selectTime")} />
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="5">{t("eventForm.min5")}</SelectItem>
                              <SelectItem value="15">{t("eventForm.min15")}</SelectItem>
                              <SelectItem value="30">{t("eventForm.min30")}</SelectItem>
                              <SelectItem value="60">{t("eventForm.hour1")}</SelectItem>
                              <SelectItem value="120">{t("eventForm.hour2")}</SelectItem>
                              <SelectItem value="1440">{t("eventForm.day1")}</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => setLocation("/events")}>
                {t("eventForm.cancel")}
              </Button>
              <Button type="submit" size="lg" disabled={createEvent.isPending} data-testid="btn-submit-event">
                {createEvent.isPending ? t("eventForm.creating") : t("eventForm.saveEvent")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
