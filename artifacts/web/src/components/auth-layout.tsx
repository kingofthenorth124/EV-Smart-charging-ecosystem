import { ReactNode } from "react";
import { Link } from "wouter";
import { Zap } from "lucide-react";

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-[100dvh] bg-background flex justify-center items-start md:items-center p-4">
      <div className="w-full max-w-[420px]">
        {/* Header / Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-primary font-semibold text-xl">
            <Zap className="text-[#f0a500] size-7" />
            Camel Mobility
          </div>
        </div>

        <div className="bg-card shadow-lg rounded-xl overflow-hidden border border-border">
          {/* Top colored border or hero */}
          <div className="bg-primary p-6 text-center relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-[#f0a500]/15 rounded-full" />
            <h1 className="text-xl font-semibold text-primary-foreground relative z-10">{title}</h1>
            <p className="text-primary-foreground/70 text-sm mt-1 relative z-10">{subtitle}</p>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
