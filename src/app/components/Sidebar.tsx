"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  TrendingUp,
  Bookmark,
  Columns2,
  FileText,
  Clapperboard,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/trending", label: "Trending", Icon: TrendingUp },
  { href: "/studio", label: "Studio", Icon: Clapperboard },
  { href: "/saved", label: "Saved", Icon: Bookmark },
  // { href: "/compare", label: "Compare", Icon: Columns2 },
  { href: "/briefs", label: "Briefs", Icon: FileText },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="fixed left-0 top-0 bottom-0 w-[200px] bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-6">
        <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-[12px] font-extrabold text-black tracking-tight shrink-0">
          🤌
        </span>
        <span className="text-[15px] font-bold text-sidebar-foreground">
          Enhanced AI Factory
        </span>
      </div>

      {/* Nav */}
      <div className="flex-1 flex flex-col gap-0.5 px-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive =
            pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              ].join(" ")}
            >
              <Icon size={18} strokeWidth={2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <span className="text-[11px] text-sidebar-foreground/50">
          Wellness Nest
        </span>
      </div>
    </nav>
  );
}
