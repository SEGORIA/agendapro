"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Bell, Calendar, CalendarCheck, CalendarX, CheckCheck, Loader2 } from "lucide-react";
import { cn, formatRelative } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

type NotifData = { data: NotificationItem[]; unreadCount: number };

const TYPE_ICONS: Record<string, React.ElementType> = {
  "appointment.created": Calendar,
  "appointment.confirmed": CalendarCheck,
  "appointment.cancelled": CalendarX,
  "appointment.completed": CalendarCheck,
};

const TYPE_COLORS: Record<string, string> = {
  "appointment.created": "text-blue-400 bg-blue-500/10",
  "appointment.confirmed": "text-emerald-400 bg-emerald-500/10",
  "appointment.cancelled": "text-red-400 bg-red-500/10",
  "appointment.completed": "text-purple-400 bg-purple-500/10",
};

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data, isLoading: loading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await axios.get("/api/notifications");
      return res.data as NotifData;
    },
    refetchInterval: 30_000,
  });
  const items = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleOpenItem(item: NotificationItem) {
    if (!item.isRead) {
      queryClient.setQueryData<NotifData>(["notifications"], (old) =>
        old
          ? {
              data: old.data.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
              unreadCount: Math.max(0, old.unreadCount - 1),
            }
          : old
      );
      axios.patch(`/api/notifications/${item.id}`).catch(() => {});
    }
    setOpen(false);
    if (item.link) router.push(item.link);
  }

  function handleMarkAllRead() {
    queryClient.setQueryData<NotifData>(["notifications"], (old) =>
      old ? { data: old.data.map((n) => ({ ...n, isRead: true })), unreadCount: 0 } : old
    );
    axios.patch("/api/notifications").catch(() => {});
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[28rem] overflow-y-auto bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 sticky top-0 bg-slate-800">
            <p className="text-white text-sm font-semibold">Notificaciones</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Marcar todas
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">Sin notificaciones por ahora</p>
          ) : (
            <div className="divide-y divide-slate-700/60">
              {items.map((item) => {
                const Icon = TYPE_ICONS[item.type] || Bell;
                const color = TYPE_COLORS[item.type] || "text-slate-400 bg-slate-500/10";
                return (
                  <button
                    key={item.id}
                    onClick={() => handleOpenItem(item)}
                    className={cn(
                      "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-700/40 transition-colors",
                      !item.isRead && "bg-slate-700/20"
                    )}
                  >
                    <div className={cn("shrink-0 w-8 h-8 rounded-lg flex items-center justify-center", color)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium leading-snug">{item.title}</p>
                      <p className="text-slate-400 text-xs mt-0.5 line-clamp-2">{item.message}</p>
                      <p className="text-slate-500 text-[11px] mt-1">{formatRelative(item.createdAt)}</p>
                    </div>
                    {!item.isRead && <span className="shrink-0 w-2 h-2 rounded-full bg-purple-500 mt-1.5" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
