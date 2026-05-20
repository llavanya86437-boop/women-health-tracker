import { ReactNode } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, CalendarHeart, Sparkles, Leaf, LogOut, Flower2, Baby, Bell } from "lucide-react";
import { useLang } from "@/i18n/LanguageProvider";
import { useAuth } from "@/hooks/useAuth";
import { useReminderScheduler } from "@/hooks/useReminderScheduler";
import { LanguageToggle } from "./LanguageToggle";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/app", end: true, icon: LayoutDashboard, key: "dashboard" as const },
  { to: "/app/tracker", icon: CalendarHeart, key: "tracker" as const },
  { to: "/app/assistant", icon: Sparkles, key: "assistant" as const },
  { to: "/app/wellness", icon: Leaf, key: "wellness" as const },
  { to: "/app/pregnancy", icon: Baby, key: "pregnancy" as const },
  { to: "/app/reminders", icon: Bell, key: "reminders" as const },
];

export const AppLayout = ({ children }: { children?: ReactNode }) => {
  const { t } = useLang();
  const { signOut } = useAuth();
  const location = useLocation();
  useReminderScheduler();

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Top bar */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/60 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-soft">
              <Flower2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold">{t.appName}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button variant="ghost" size="sm" onClick={signOut} className="rounded-full gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t.nav.signOut}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10 pb-28 md:pb-10">
        <div className="grid md:grid-cols-[220px_1fr] gap-8">
          {/* Sidebar (desktop) */}
          <aside className="hidden md:block">
            <nav className="sticky top-24 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-4 py-3 rounded-2xl transition-smooth font-medium",
                        isActive
                          ? "bg-gradient-primary text-primary-foreground shadow-soft"
                          : "text-foreground/70 hover:bg-primary-soft hover:text-foreground"
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {t.nav[item.key]}
                  </NavLink>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0 animate-fade-in" key={location.pathname}>
            {children ?? <Outlet />}
          </main>
        </div>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 backdrop-blur-xl bg-background/85 border-t border-border/60">
        <div className="grid grid-cols-6 px-2 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "flex flex-col items-center gap-1 py-2 rounded-xl text-xs font-medium transition-smooth",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center", isActive && "bg-primary-soft")}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span>{t.nav[item.key]}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
