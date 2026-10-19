"use client";

import React from "react";
import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") {
          window.print();
        }
      }}
      className="hidden sm:inline-flex items-center gap-1.5 text-xs text-neutral-600 hover:text-black px-3 py-1.5 rounded-full border border-neutral-200 hover:border-black transition-all"
      title="Распечатать или сохранить в PDF"
    >
      <Printer className="w-3.5 h-3.5" />
      <span>Версия для печати</span>
    </button>
  );
}
