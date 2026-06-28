import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, CheckSquare, Settings, LayoutGrid, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { LanguageSelector } from "./language-selector";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const { t } = useTranslation();

  const navigation = [
    { key: "nav.dashboard", href: "/", icon: LayoutGrid },
    { key: "nav.events", href: "/events", icon: CalendarDays },
    { key: "nav.categories", href: "/categories", icon: CheckSquare },
    { key: "nav.settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 font-serif text-2xl font-bold text-sidebar-primary" data-testid="link-home">
            <Calendar className="w-6 h-6" />
            <span>Agenda</span>
          </Link>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
                data-testid={`link-nav-${item.key.split(".")[1]}`}
              >
                <item.icon className="w-5 h-5" />
                {t(item.key)}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 space-y-3">
          <LanguageSelector />
          <Button asChild className="w-full justify-start gap-2 shadow-md">
            <Link href="/events/new" data-testid="btn-new-event">
              <Plus className="w-4 h-4" />
              {t("nav.newEvent")}
            </Link>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:hidden">
          <Link href="/" className="flex items-center gap-2 font-serif text-xl font-bold text-primary">
            <Calendar className="w-5 h-5" />
            <span>Agenda</span>
          </Link>
          <Button asChild size="sm" className="gap-1">
            <Link href="/events/new">
              <Plus className="w-4 h-4" />
              {t("nav.new")}
            </Link>
          </Button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto w-full">
            {children}
          </div>
        </div>
        
        {/* Mobile Nav */}
        <nav className="h-16 border-t border-border bg-card flex items-center justify-around px-2 md:hidden">
           {navigation.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex flex-col items-center justify-center w-16 h-full gap-1 ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{t(item.key)}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}
