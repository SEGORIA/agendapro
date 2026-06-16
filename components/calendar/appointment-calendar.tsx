"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  startOfWeek, startOfDay, addDays, addWeeks, format, isSameDay, isToday,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Loader2, CalendarDays, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, APPOINTMENT_STATUS_LABELS } from "@/lib/utils";

// ─── Constantes de la rejilla ───────────────────────────────
const DAY_START_HOUR = 6;          // primera hora visible
const DAY_END_HOUR = 22;           // última hora visible
const HOUR_HEIGHT = 60;            // px por hora → 1 min = 1 px
const SNAP_MINUTES = 15;           // imán al reprogramar
const TOTAL_MIN = (DAY_END_HOUR - DAY_START_HOUR) * 60;
const HOURS = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR + 1 }, (_, i) => DAY_START_HOUR + i);

type View = "week" | "day";

interface Appt {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  client: { name: string };
  service: { name: string; color: string; durationMin: number } | null;
  staff: { name: string | null } | null;
}

// minutos desde el inicio del día visible (clamp dentro de la ventana)
function minutesFromStart(d: Date) {
  return (d.getHours() - DAY_START_HOUR) * 60 + d.getMinutes();
}

// Empaqueta citas solapadas en "carriles" por cada día (algoritmo greedy por cluster)
function layoutDay(events: { id: string; start: number; end: number }[]) {
  const result: Record<string, { lane: number; lanes: number }> = {};
  const sorted = [...events].sort((a, b) => a.start - b.start || a.end - b.end);
  let cluster: typeof sorted = [];
  let clusterMaxEnd = -Infinity;

  const flush = () => {
    const laneEnds: number[] = [];
    const laneOf: Record<string, number> = {};
    for (const ev of cluster) {
      let placed = false;
      for (let i = 0; i < laneEnds.length; i++) {
        if (laneEnds[i] <= ev.start) { laneEnds[i] = ev.end; laneOf[ev.id] = i; placed = true; break; }
      }
      if (!placed) { laneOf[ev.id] = laneEnds.length; laneEnds.push(ev.end); }
    }
    for (const ev of cluster) result[ev.id] = { lane: laneOf[ev.id], lanes: laneEnds.length };
    cluster = [];
  };

  for (const ev of sorted) {
    if (cluster.length && ev.start >= clusterMaxEnd) { flush(); clusterMaxEnd = -Infinity; }
    cluster.push(ev);
    clusterMaxEnd = Math.max(clusterMaxEnd, ev.end);
  }
  if (cluster.length) flush();
  return result;
}

export function AppointmentCalendar() {
  const router = useRouter();
  const [view, setView] = useState<View>("week");
  const [cursor, setCursor] = useState(() => new Date());
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const daysRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Días visibles según la vista
  const days = useMemo(() => {
    if (view === "day") return [startOfDay(cursor)];
    const ws = startOfWeek(cursor, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  }, [view, cursor]);

  // Rango como strings ISO (primitivos estables) para no recrear fetchAppointments cada render
  const { fromISO, toISO } = useMemo(() => ({
    fromISO: days[0].toISOString(),
    toISO: addDays(days[days.length - 1], 1).toISOString(),
  }), [days]);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/appointments/calendar", {
        params: { from: fromISO, to: toISO },
      });
      setAppointments(data.data);
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  }, [fromISO, toISO]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Reloj para la línea de "ahora"
  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Scroll inicial cerca de las 8:00
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = (8 - DAY_START_HOUR) * HOUR_HEIGHT;
  }, []);

  // ─── Drag para reprogramar ─────────────────────────────────
  const dragRef = useRef<{
    id: string; durationMin: number; startClientX: number; startClientY: number;
    originStartMin: number; originDayIndex: number; moved: boolean;
  } | null>(null);
  const [preview, setPreview] = useState<{ id: string; startMin: number; dayIndex: number } | null>(null);

  const onBlockPointerDown = (e: React.PointerEvent, apt: Appt, dayIndex: number) => {
    if (apt.status === "CANCELLED") { router.push(`/appointments/${apt.id}`); return; }
    e.currentTarget.setPointerCapture(e.pointerId);
    const startMin = Math.max(0, minutesFromStart(new Date(apt.startsAt)));
    const durationMin = apt.service?.durationMin
      ?? Math.round((new Date(apt.endsAt).getTime() - new Date(apt.startsAt).getTime()) / 60000);
    dragRef.current = {
      id: apt.id, durationMin,
      startClientX: e.clientX, startClientY: e.clientY,
      originStartMin: startMin, originDayIndex: dayIndex, moved: false,
    };
    setPreview({ id: apt.id, startMin, dayIndex });
  };

  const onBlockPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dy = e.clientY - drag.startClientY;
    const dx = e.clientX - drag.startClientX;
    if (!drag.moved && Math.abs(dy) + Math.abs(dx) < 4) return;
    drag.moved = true;

    // Vertical → minutos (snap a 15)
    const rawMin = drag.originStartMin + dy;
    const snapped = Math.round(rawMin / SNAP_MINUTES) * SNAP_MINUTES;
    const startMin = Math.max(0, Math.min(snapped, TOTAL_MIN - drag.durationMin));

    // Horizontal → día (solo en vista semana)
    let dayIndex = drag.originDayIndex;
    if (view === "week" && daysRef.current) {
      const rect = daysRef.current.getBoundingClientRect();
      const colW = rect.width / days.length;
      dayIndex = Math.max(0, Math.min(days.length - 1, Math.floor((e.clientX - rect.left) / colW)));
    }
    setPreview({ id: drag.id, startMin, dayIndex });
  };

  const onBlockPointerUp = async (e: React.PointerEvent, apt: Appt) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    if (!drag.moved) {
      setPreview(null);
      router.push(`/appointments/${apt.id}`);
      return;
    }

    const p = preview;
    setPreview(null);
    if (!p) return;

    const targetDay = days[p.dayIndex];
    const newStart = new Date(targetDay);
    newStart.setHours(DAY_START_HOUR, 0, 0, 0);
    newStart.setMinutes(p.startMin);

    // Sin cambio real → no hacer nada
    if (newStart.getTime() === new Date(apt.startsAt).getTime()) return;

    // Update optimista
    const newEnd = new Date(newStart.getTime() + drag.durationMin * 60000);
    setAppointments((prev) =>
      prev.map((a) => (a.id === apt.id ? { ...a, startsAt: newStart.toISOString(), endsAt: newEnd.toISOString() } : a))
    );

    try {
      await axios.patch(`/api/appointments/${apt.id}`, { startsAt: newStart.toISOString() });
    } catch {
      fetchAppointments(); // revertir desde el servidor si falla
    }
  };

  // ─── Navegación ────────────────────────────────────────────
  const goPrev = () => setCursor((c) => (view === "week" ? addWeeks(c, -1) : addDays(c, -1)));
  const goNext = () => setCursor((c) => (view === "week" ? addWeeks(c, 1) : addDays(c, 1)));
  const goToday = () => setCursor(new Date());

  const title = view === "week"
    ? `${format(days[0], "d MMM", { locale: es })} – ${format(days[6], "d MMM yyyy", { locale: es })}`
    : format(days[0], "EEEE d 'de' MMMM yyyy", { locale: es });

  const nowDate = new Date(nowTick);
  const nowMin = minutesFromStart(nowDate);
  const nowVisible = nowMin >= 0 && nowMin <= TOTAL_MIN;

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-700 flex-wrap">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={goToday} className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs">
            Hoy
          </Button>
          <div className="flex items-center">
            <button onClick={goPrev} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Anterior">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={goNext} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 transition-colors" title="Siguiente">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-white font-semibold text-sm capitalize ml-1">{title}</h2>
          {loading && <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />}
        </div>

        <div className="flex items-center gap-1 bg-slate-900/60 rounded-lg p-1">
          <button
            onClick={() => setView("week")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              view === "week" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white")}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Semana
          </button>
          <button
            onClick={() => setView("day")}
            className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
              view === "day" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white")}
          >
            <CalendarIcon className="w-3.5 h-3.5" /> Día
          </button>
        </div>
      </div>

      {/* Header de días */}
      <div className="flex border-b border-slate-700">
        <div className="w-14 shrink-0" />
        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((d) => (
            <div key={d.toISOString()} className="text-center py-2 border-l border-slate-700/50">
              <p className="text-slate-500 text-xs uppercase">{format(d, "EEE", { locale: es })}</p>
              <p className={cn("text-sm font-semibold mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full",
                isToday(d) ? "bg-purple-600 text-white" : "text-slate-300")}>
                {format(d, "d")}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Cuerpo con scroll */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: "640px" }}>
        <div className="flex relative" style={{ height: TOTAL_MIN }}>
          {/* Gutter de horas */}
          <div className="w-14 shrink-0 relative">
            {HOURS.map((h) => (
              <div key={h} className="absolute right-2 -translate-y-1/2 text-[10px] text-slate-500" style={{ top: (h - DAY_START_HOUR) * 60 }}>
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {/* Columnas de días */}
          <div ref={daysRef} className="flex-1 grid relative" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {/* Líneas horizontales de hora */}
            {HOURS.map((h) => (
              <div key={h} className="absolute left-0 right-0 border-t border-slate-700/40" style={{ top: (h - DAY_START_HOUR) * 60 }} />
            ))}

            {days.map((day, dayIndex) => {
              const dayAppts = appointments.filter((a) => isSameDay(new Date(a.startsAt), day));
              const layout = layoutDay(dayAppts.map((a) => ({
                id: a.id,
                start: Math.max(0, minutesFromStart(new Date(a.startsAt))),
                end: Math.min(TOTAL_MIN, minutesFromStart(new Date(a.endsAt))),
              })));

              return (
                <div key={day.toISOString()} className="relative border-l border-slate-700/50">
                  {/* Línea de "ahora" */}
                  {nowVisible && isToday(day) && (
                    <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: nowMin }}>
                      <div className="h-px bg-red-500" />
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 absolute -left-0.5 -top-[3px]" />
                    </div>
                  )}

                  {dayAppts.map((apt) => {
                    const isDragging = preview?.id === apt.id;
                    const lay = layout[apt.id] ?? { lane: 0, lanes: 1 };
                    const startMin = isDragging && preview ? preview.startMin : Math.max(0, minutesFromStart(new Date(apt.startsAt)));
                    const endMinRaw = Math.min(TOTAL_MIN, minutesFromStart(new Date(apt.endsAt)));
                    const startMinReal = Math.max(0, minutesFromStart(new Date(apt.startsAt)));
                    const height = Math.max(22, endMinRaw - startMinReal);

                    // En drag con cambio de día, sólo se dibuja en la columna destino
                    if (isDragging && preview && preview.dayIndex !== dayIndex) return null;

                    const color = apt.service?.color ?? "#6366f1";
                    const widthPct = 100 / lay.lanes;
                    const leftPct = lay.lane * widthPct;
                    const cancelled = apt.status === "CANCELLED";

                    return (
                      <div
                        key={apt.id}
                        onPointerDown={(e) => onBlockPointerDown(e, apt, dayIndex)}
                        onPointerMove={onBlockPointerMove}
                        onPointerUp={(e) => onBlockPointerUp(e, apt)}
                        className={cn(
                          "absolute rounded-md px-2 py-1 overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none transition-shadow",
                          isDragging ? "z-30 shadow-lg ring-2 ring-white/40" : "z-10",
                          cancelled && "opacity-50"
                        )}
                        style={{
                          top: startMin,
                          height,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                          backgroundColor: `${color}2e`,
                          borderLeft: `3px solid ${color}`,
                        }}
                        title={`${apt.client.name} · ${apt.service?.name ?? "Cita"}`}
                      >
                        <p className={cn("text-[11px] font-semibold text-white leading-tight truncate", cancelled && "line-through")}>
                          {apt.client.name}
                        </p>
                        {height > 32 && (
                          <p className="text-[10px] text-slate-300 leading-tight truncate">
                            {format(new Date(apt.startsAt), "HH:mm")} · {apt.service?.name ?? "Cita"}
                          </p>
                        )}
                        {height > 50 && apt.status !== "CONFIRMED" && (
                          <p className="text-[9px] text-slate-400 mt-0.5">{APPOINTMENT_STATUS_LABELS[apt.status]}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Estado vacío */}
      {!loading && appointments.length === 0 && (
        <div className="text-center py-6 border-t border-slate-700">
          <p className="text-slate-500 text-sm">No hay citas en este {view === "week" ? "semana" : "día"}</p>
        </div>
      )}
    </div>
  );
}
