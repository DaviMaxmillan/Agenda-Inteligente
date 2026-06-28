import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Settings2, MessageSquare, Phone, Key, Save, Send, Zap, CalendarDays, RefreshCw, Unlink, ExternalLink } from "lucide-react";
import {
  useGetNotificationSettings, useUpdateNotificationSettings, useSendTestNotification,
  getGetNotificationSettingsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "@/components/language-selector";

const settingsSchema = z.object({
  callmebotPhone: z.string().optional(),
  callmebotApiKey: z.string().optional(),
  twilioAccountSid: z.string().optional(),
  twilioAuthToken: z.string().optional(),
  twilioWhatsappFrom: z.string().optional(),
  defaultPhone: z.string().optional(),
});

export default function SettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings } = useGetNotificationSettings();
  const updateSettings = useUpdateNotificationSettings();
  const sendTest = useSendTestNotification();

  const form = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      callmebotPhone: "",
      callmebotApiKey: "",
      twilioAccountSid: "",
      twilioAuthToken: "",
      twilioWhatsappFrom: "",
      defaultPhone: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        callmebotPhone: settings.callmebotPhone || "",
        callmebotApiKey: settings.callmebotApiKey || "",
        twilioAccountSid: settings.twilioAccountSid || "",
        twilioAuthToken: settings.twilioAuthToken || "",
        twilioWhatsappFrom: settings.twilioWhatsappFrom || "",
        defaultPhone: settings.defaultPhone || "",
      });
    }
  }, [settings, form]);

  const onSubmit = (values: z.infer<typeof settingsSchema>) => {
    updateSettings.mutate(
      {
        data: {
          callmebotPhone: values.callmebotPhone || null,
          callmebotApiKey: values.callmebotApiKey || null,
          twilioAccountSid: values.twilioAccountSid || null,
          twilioAuthToken: values.twilioAuthToken || null,
          twilioWhatsappFrom: values.twilioWhatsappFrom || null,
          defaultPhone: values.defaultPhone || null,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetNotificationSettingsQueryKey() });
          toast({ title: t("toasts.settingsSaved"), description: t("toasts.settingsSavedDesc") });
        },
        onError: () => {
          toast({ title: t("toasts.error"), description: t("toasts.errorSettings"), variant: "destructive" });
        }
      }
    );
  };

  const handleTestNotification = () => {
    sendTest.mutate(
      undefined,
      {
        onSuccess: (res) => {
          if (res.success) {
            toast({ title: t("toasts.testSent"), description: res.message });
          } else {
            toast({ title: t("toasts.testFailed"), description: res.message, variant: "destructive" });
          }
        },
        onError: () => {
          toast({ title: t("toasts.error"), description: t("toasts.errorTest"), variant: "destructive" });
        }
      }
    );
  };

  const isAnyConfigured = settings?.isConfigured;
  const callmebotConfigured = settings?.callmebotConfigured;
  const twilioConfigured = settings?.twilioConfigured;

  const [googleStatus, setGoogleStatus] = useState<{ connected: boolean; email: string | null; lastSyncAt: string | null } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch("/api/google-calendar/status")
      .then(r => r.json())
      .then(setGoogleStatus)
      .catch(() => setGoogleStatus({ connected: false, email: null, lastSyncAt: null }));
  }, []);

  const handleGoogleConnect = async () => {
    const res = await fetch("/api/google-calendar/auth-url");
    if (!res.ok) {
      toast({ title: "Google Calendar não configurado", description: "Configure as credenciais GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET primeiro.", variant: "destructive" });
      return;
    }
    const { url } = await res.json();
    window.location.href = url;
  };

  const handleGoogleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/google-calendar/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Sincronizado!", description: `${data.created} criados, ${data.updated} atualizados.` });
        setGoogleStatus(s => s ? { ...s, lastSyncAt: new Date().toISOString() } : s);
      } else {
        toast({ title: "Erro na sincronização", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro na sincronização", variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleGoogleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/google-calendar/disconnect", { method: "DELETE" });
      setGoogleStatus({ connected: false, email: null, lastSyncAt: null });
      toast({ title: "Google Calendar desconectado" });
    } finally {
      setDisconnecting(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      toast({ title: "Google Calendar conectado!", description: "Clique em Sincronizar para importar seus eventos." });
      fetch("/api/google-calendar/status").then(r => r.json()).then(setGoogleStatus);
      window.history.replaceState({}, "", "/settings");
    }
  }, []);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-8 pb-20">
        <header>
          <h1 className="text-3xl font-serif font-bold tracking-tight flex items-center gap-3">
            <Settings2 className="w-8 h-8 text-primary" /> {t("settings.title")}
          </h1>
          <p className="text-muted-foreground mt-2">{t("settings.subtitle")}</p>
        </header>

        {/* Google Calendar Card */}
        <Card className={`border-2 shadow-sm overflow-hidden transition-colors ${googleStatus?.connected ? "border-blue-300 dark:border-blue-700" : "border-border/50"}`}>
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b border-border/50">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-xl">Google Calendar</CardTitle>
                    {googleStatus?.connected ? (
                      <Badge className="bg-blue-600 text-white text-xs">✓ Conectado</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Desconectado</Badge>
                    )}
                  </div>
                  <CardDescription className="mt-0.5">Sincronize eventos em ambas as direções com o Google Calendar</CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {googleStatus?.connected ? (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 text-sm space-y-1 border border-blue-200 dark:border-blue-800">
                  <p className="text-blue-800 dark:text-blue-300"><span className="font-semibold">Conta:</span> {googleStatus.email}</p>
                  {googleStatus.lastSyncAt && (
                    <p className="text-blue-600 dark:text-blue-400">
                      <span className="font-semibold">Última sync:</span>{" "}
                      {new Date(googleStatus.lastSyncAt).toLocaleString("pt-BR")}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="outline" onClick={handleGoogleSync} disabled={syncing} className="gap-2">
                    <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
                    {syncing ? "Sincronizando..." : "Sincronizar agora"}
                  </Button>
                  <Button type="button" variant="ghost" onClick={handleGoogleDisconnect} disabled={disconnecting} className="gap-2 text-destructive hover:text-destructive">
                    <Unlink className="w-4 h-4" />
                    {disconnecting ? "Desconectando..." : "Desconectar"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Conecte sua conta Google para sincronizar eventos bidirecionalmente com o Google Calendar.
                </p>
                <Button type="button" onClick={handleGoogleConnect} className="gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                  <ExternalLink className="w-4 h-4" />
                  Conectar Google Calendar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Language Card */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="bg-muted/20 border-b border-border/50">
            <CardTitle className="text-xl">{t("settings.language")}</CardTitle>
            <CardDescription>{t("settings.languageDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="max-w-xs">
              <LanguageSelector />
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* CallMeBot — FREE */}
            <Card className={`border-2 shadow-sm overflow-hidden transition-colors ${callmebotConfigured ? "border-green-300 dark:border-green-700" : "border-border/50"}`}>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-b border-border/50">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white shadow">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">CallMeBot</CardTitle>
                        <Badge className="bg-green-500 text-white text-xs">{t("settings.free")}</Badge>
                        {callmebotConfigured && (
                          <Badge variant="outline" className="border-green-500 text-green-700 text-xs">
                            ✓ {t("settings.integrationActive")}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-0.5">{t("settings.callmebotDesc")}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">

                {/* How to get API key */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm space-y-2">
                  <p className="font-semibold text-blue-800 dark:text-blue-300">📱 {t("settings.callmebotHowTitle")}</p>
                  <ol className="list-decimal list-inside space-y-1 text-blue-700 dark:text-blue-400">
                    <li>{t("settings.callmebotStep1")}</li>
                    <li>{t("settings.callmebotStep2")}</li>
                    <li>{t("settings.callmebotStep3")}</li>
                    <li>{t("settings.callmebotStep4")}</li>
                  </ol>
                  <a
                    href="https://www.callmebot.com/blog/free-api-whatsapp-messages/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium underline mt-1"
                  >
                    {t("settings.callmebotLearnMore")} →
                  </a>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="callmebotPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("settings.callmebotPhone")}</FormLabel>
                        <FormControl>
                          <Input placeholder="+5511999999999" {...field} />
                        </FormControl>
                        <FormDescription>{t("settings.callmebotPhoneDesc")}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="callmebotApiKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("settings.callmebotApiKey")}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="1234567" {...field} />
                        </FormControl>
                        <FormDescription>{t("settings.callmebotApiKeyDesc")}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Twilio — Paid */}
            <Card className={`border shadow-sm overflow-hidden transition-colors ${twilioConfigured ? "border-purple-300 dark:border-purple-700" : "border-border/50"}`}>
              <CardHeader className="bg-muted/20 border-b border-border/50">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white shadow">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl">Twilio</CardTitle>
                        <Badge variant="secondary" className="text-xs">{t("settings.paid")}</Badge>
                        {twilioConfigured && (
                          <Badge variant="outline" className="border-purple-500 text-purple-700 text-xs">
                            ✓ {t("settings.integrationActive")}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-0.5">{t("settings.whatsappDesc")}</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-4 bg-muted/20 p-5 rounded-lg border border-border/50">
                  <h3 className="font-semibold flex items-center gap-2 text-sm">
                    <Key className="w-4 h-4" /> {t("settings.apiCredentials")}
                  </h3>

                  <FormField
                    control={form.control}
                    name="twilioAccountSid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("settings.accountSid")}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="AC..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="twilioAuthToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("settings.authToken")}</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="twilioWhatsappFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("settings.whatsappFrom")}</FormLabel>
                        <FormControl>
                          <Input placeholder="whatsapp:+14155238886" {...field} />
                        </FormControl>
                        <FormDescription>{t("settings.whatsappFromDesc")}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="pt-2">
                  <FormField
                    control={form.control}
                    name="defaultPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <Phone className="w-4 h-4" /> {t("settings.defaultPhone")}
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormDescription>{t("settings.defaultPhoneDesc")}</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestNotification}
                disabled={!isAnyConfigured || sendTest.isPending}
                className="w-full sm:w-auto gap-2"
              >
                <Send className="w-4 h-4" />
                {sendTest.isPending ? t("settings.sending") : t("settings.sendTest")}
              </Button>
              <Button type="submit" className="w-full sm:w-auto gap-2" disabled={updateSettings.isPending}>
                <Save className="w-4 h-4" />
                {updateSettings.isPending ? t("settings.saving") : t("settings.saveSettings")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
