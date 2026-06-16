"use client";

import { useState } from "react";
import { CalendarDays, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { AppointmentCalendar } from "@/components/calendar/appointment-calendar";

export function AppointmentsView({ listContent }: { listContent: React.ReactNode }) {
  const [view, setView] = useState<"calendar" | "list">("calendar");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-700 rounded-lg p-1 w-fit">
        <button
          onClick={() => setView("calendar")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            view === "calendar" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
          )}
        >
          <CalendarDays className="w-3.5 h-3.5" /> Calendario
        </button>
        <button
          onClick={() => setView("list")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
            view === "list" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"
          )}
        >
          <List className="w-3.5 h-3.5" /> Lista
        </button>
      </div>

      {view === "calendar" ? <AppointmentCalendar /> : listContent}
    </div>
  );
}
