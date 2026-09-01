"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sliders,
  BookOpen,
  Send,
  ArrowLeft,
  LogOut,
  User,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { getClientUser, setClientUser, type AuthUser } from "@/lib/auth";

const LINKS = [
  { href: "/dashboard", label: "Обзор", icon: LayoutDashboard },
  { href: "/dashboard/settings", label: "Настройки бота", icon: Sliders },
  { href: "/dashboard/knowledge-base", label: "База знаний", icon: BookOpen },
  { href: "/dashboard/telegram", label: "Telegram Business", icon: Send },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const u = getClientUser();
    setUser(u);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
    } catch {
      // ignore
    }
    setClientUser(null);
    router.push("/login");
  };

  return (
    <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-neutral-200 bg-white p-5 md:h-screen flex flex-col justify-between shadow-sm md:sticky md:top-0">
      <div>
        <div className="mb-8 px-2 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <BrandLogo className="w-7 h-7" />
            <span className="font-heading text-sm font-semibold text-black tracking-tight">
              Личный кабинет
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-medium text-neutral-600 hover:text-black flex items-center gap-1 transition-colors px-2 py-1 rounded-md hover:bg-neutral-100"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            На сайт
          </Link>
        </div>

        {/* На мобиле пункты меню идут в горизонтальный скролл (flex md:flex-col).
            shrink-0 не даёт им сплющиваться при большем числе ссылок. */}
        <nav className="flex md:flex-col gap-1.5 overflow-x-auto pb-2 md:pb-0">
          {LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`shrink-0 px-3.5 py-2.5 rounded-xl text-sm whitespace-nowrap transition-all flex items-center gap-3 font-medium ${
                  isActive
                    ? "bg-black text-white shadow-sm"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-neutral-500"}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-neutral-200 px-2 space-y-3">
        {/* User Card */}
        {user ? (
          <div className="flex items-center justify-between gap-2 p-2 bg-neutral-50 rounded-xl border border-neutral-100">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shrink-0 text-xs font-semibold">
                {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-black truncate">{user.name}</p>
                <p className="text-[10px] text-neutral-500 truncate">
                  {user.email || (user.telegramUsername ? `@${user.telegramUsername}` : "Telegram User")}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors shrink-0"
              title="Выйти из аккаунта"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Telegram AI 24/7</span>
            <span className="text-emerald-600 font-medium">Активен</span>
          </div>
        )}
      </div>
    </aside>
  );
}
