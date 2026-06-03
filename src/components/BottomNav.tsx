"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BarChart2, Map, Plus, Trophy, Brain, Dumbbell } from "lucide-react";

const tabs = [
  { href: "/dashboard", icon: Home, label: "Home" },
  { href: "/dashboard/journey", icon: Map, label: "Journey" },

  { href: "/dashboard/strength", icon: Dumbbell, label: "Strength" },
    { href: "/dashboard/log", icon: Plus, label: "Log Run" },
  { href: "/dashboard/leaderboard", icon: Trophy, label: "Ranks" },
  { href: "/dashboard/insights", icon: Brain, label: "AI" },
  { href: "/dashboard/progress", icon: BarChart2, label: "Progress" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="glass fixed bottom-0 left-0 right-0 z-50 flex justify-around items-end pb-safe"
      style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))", paddingTop: "10px" }}>
      {tabs.map(({ href, icon: Icon, label }) => {
        const active = pathname === href;
        const isCenter = label === "Log Run";
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-0.5 min-w-[52px]"
            style={{ textDecoration: "none" }}>
            {isCenter ? (
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-1"
                style={{
                  background: "linear-gradient(135deg, #30d158, #25a244)",
                  boxShadow: "0 4px 20px rgba(48,209,88,0.4)",
                }}>
                <Icon size={22} color="white" strokeWidth={2.5} />
              </div>
            ) : (
              <>
                <Icon
                  size={24}
                  strokeWidth={active ? 2.5 : 1.8}
                  style={{ color: active ? "#30d158" : "#8e8e93" }}
                />
                <span className="text-[10px] font-medium"
                  style={{ color: active ? "#30d158" : "#8e8e93" }}>
                  {label}
                </span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
