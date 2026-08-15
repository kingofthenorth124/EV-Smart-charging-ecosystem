import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Zap, LogOut, Shield, Users, Home, CreditCard } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const handleLogout = async () => {
    await logout();
    setLocation("/login");
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/account/security", label: "Security", icon: Shield },
  ];

  if (user?.role === "SUPER_ADMIN" || user?.role === "ADMIN_OFFICER") {
    navItems.push({ href: "/admin/users", label: "Users", icon: Users });
  }

  return (
    <div className="min-h-[100dvh] bg-background flex justify-center items-start md:py-8 md:px-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="bg-primary p-5 md:rounded-t-xl text-primary-foreground flex flex-col sm:flex-row gap-4 justify-between sm:items-center relative overflow-hidden">
          <div className="flex items-center gap-2 font-semibold text-lg relative z-10">
            <Zap className="text-[#f0a500] size-6" />
            Camel Mobility Wallet
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/10 rounded-full px-3 py-1 flex items-center gap-2 text-sm font-medium">
              <CreditCard className="size-4" />
              NFC Active
            </div>
          </div>
        </div>

        {/* Tabs / Nav */}
        <div className="bg-primary px-5 flex gap-1 overflow-x-auto scrollbar-hide">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-card text-foreground"
                    : "text-primary-foreground/70 hover:bg-white/10 hover:text-white"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium text-primary-foreground/70 hover:bg-white/10 hover:text-white transition-colors ml-auto whitespace-nowrap"
            data-testid="nav-logout"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </div>

        {/* Content */}
        <div className="bg-card p-4 md:p-6 md:rounded-b-xl min-h-[520px] shadow-sm border border-border">
          {children}
        </div>
      </div>
    </div>
  );
}
