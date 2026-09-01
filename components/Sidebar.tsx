"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Обзор" },
  { href: "/dashboard/settings", label: "Настройки бота" },
  { href: "/dashboard/knowledge-base", label: "База знаний" },
  { href: "/dashboard/telegram", label: "Telegram Business" },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-border p-4 md:h-screen">
      <div className="font-semibold mb-6 px-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-accent shadow-glow" />
        Кабинет
      </div>
      <nav className="flex md:flex-col gap-1 overflow-x-auto">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-2 rounded-xl text-sm whitespace-nowrap transition-colors ${
              pathname === link.href
                ? "bg-accent/10 text-accent border border-accent/30"
                : "text-muted hover:bg-surfaceHover hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
