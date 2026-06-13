"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Clock, ChevronLeft, ChevronRight, CheckCircle, Globe, ArrowLeft, Calendar as CalendarIcon, User } from "lucide-react";
import {
  format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isSameMonth, isBefore, startOfToday, addMinutes,
} from "date-fns";
import { es } from "date-fns/locale";
import axios from "axios";
import type { BookingQuestion } from "@/lib/booking";

interface Service {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  color: string;
  description?: string | null;
  questions: BookingQuestion[];
}

interface StaffMember {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface BookingWidgetProps {
  tenant: {
    id: string;
    name: string;
    logoUrl?: string | null;
    primaryColor: string;
    accentColor: string;
  };
  services: Service[];
  staff: StaffMember[];
  availableWeekdays: number[]; // 0=Dom ... 6=Sab según reglas de disponibilidad
}

interface Slot {
  time: string;
  datetime: string;
  available: boolean;
}

type Step = "service" | "datetime" | "details" | "success";

const WEEKDAY_HEADERS = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];

export function BookingWidget({ tenant, services, staff, availableWeekdays }: BookingWidgetProps) {
  const primary = tenant.primaryColor;
  const today = startOfToday();

  const [step, setStep] = useState<Step>(services.length === 1 ? "datetime" : "service");
  const [service, setService] = useState<Service | null>(services.length === 1 ? services[0] : null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  const [viewMonth, setViewMonth] = useState(startOfMonth(today));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [info, setInfo] = useState({ name: "", email: "", phone: "", notes: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [timezone, setTimezone] = useState("");

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimezone(`${tz.replace(/_/g, " ")} (${format(new Date(), "HH:mm")})`);
  }, []);

  // Días del mes visible, con padding para alinear la cuadrícula
  const calendarDays = useMemo(() => {
    const days = eachDayOfInterval({ start: startOfMonth(viewMonth), end: endOfMonth(viewMonth) });
    const offset = getDay(days[0]);
    return { days, offset };
  }, [viewMonth]);

  function isDayEnabled(day: Date) {
    return availableWeekdays.includes(getDay(day)) && !isBefore(day, today);
  }

  // Cargar slots reales cuando cambia servicio/fecha/staff
  useEffect(() => {
    if (!service || !selectedDate) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    const params = new URLSearchParams({
      tenantId: tenant.id,
      serviceId: service.id,
      date: format(selectedDate, "yyyy-MM-dd"),
    });
    if (selectedStaff) params.set("staffId", selectedStaff.id);
    axios
      .get(`/api/slots?${params}`)
      .then((res) => setSlots((res.data.data as Slot[]).filter((s) => s.available)))
      .catch(() => setSlots([]))
      .finally(() => setSlotsLoading(false));
  }, [service, selectedDate, selectedStaff, tenant.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !selectedSlot) return;
    setError("");

    // Validar preguntas requeridas
    for (const q of service.questions) {
      if (q.required && !answers[q.id]?.trim()) {
        setError(`Por favor responde: "${q.label}"`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const formData: Record<string, string> = {};
      for (const q of service.questions) {
        if (answers[q.id]?.trim()) formData[q.label] = answers[q.id].trim();
      }

      await axios.post("/api/appointments/public", {
        tenantId: tenant.id,
        serviceId: service.id,
        staffId: selectedStaff?.id,
        startsAt: selectedSlot.datetime,
        clientName: info.name,
        clientEmail: info.email,
        clientPhone: info.phone || undefined,
        notes: info.notes || undefined,
        formData,
      });
      setStep("success");
    } catch (err: any) {
      setError(err.response?.data?.error || "No pudimos agendar tu cita. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  const tenantAvatar = tenant.logoUrl ? (
    <img src={tenant.logoUrl} alt={tenant.name} className="w-16 h-16 rounded-full object-cover border border-slate-200" />
  ) : (
    <div
      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold"
      style={{ backgroundColor: primary }}
    >
      {tenant.name[0].toUpperCase()}
    </div>
  );

  // ─── Pantalla de éxito ───
  if (step === "success" && service && selectedSlot && selectedDate) {
    const start = new Date(selectedSlot.datetime);
    const end = addMinutes(start, service.durationMin);
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg mx-auto overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: primary }} />
        <div className="p-8 text-center">
          <CheckCircle className="w-14 h-14 mx-auto mb-4" style={{ color: primary }} />
          <h2 className="text-2xl font-bold text-slate-900 mb-1">¡Cita confirmada!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Enviamos los detalles a <strong className="text-slate-700">{info.email}</strong>
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-left space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: service.color }} />
              <p className="text-slate-900 font-semibold">{service.name}</p>
            </div>
            <div className="flex items-center gap-3 text-slate-600 text-sm">
              <CalendarIcon className="w-4 h-4 shrink-0" />
              <span className="capitalize">{format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-600 text-sm">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{format(start, "h:mm a")} – {format(end, "h:mm a")} · {service.durationMin} min</span>
            </div>
            {selectedStaff && (
              <div className="flex items-center gap-3 text-slate-600 text-sm">
                <User className="w-4 h-4 shrink-0" />
                <span>{selectedStaff.name}</span>
              </div>
            )}
            {timezone && (
              <div className="flex items-center gap-3 text-slate-500 text-xs">
                <Globe className="w-4 h-4 shrink-0" />
                <span>{timezone}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setStep(services.length === 1 ? "datetime" : "service");
              if (services.length > 1) setService(null);
              setSelectedDate(null);
              setSelectedSlot(null);
              setInfo({ name: "", email: "", phone: "", notes: "" });
              setAnswers({});
            }}
            className="mt-6 text-sm font-medium hover:underline"
            style={{ color: primary }}
          >
            Agendar otra cita
          </button>
        </div>
      </div>
    );
  }

  // ─── Paso 1: elegir servicio ───
  if (step === "service") {
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg mx-auto overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: primary }} />
        <div className="p-8 text-center border-b border-slate-100">
          <div className="flex justify-center mb-3">{tenantAvatar}</div>
          <p className="text-slate-500 text-sm font-medium">{tenant.name}</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Agenda tu cita</h1>
          <p className="text-slate-500 text-sm mt-1">Selecciona el servicio que necesitas</p>
        </div>
        <div className="divide-y divide-slate-100">
          {services.length === 0 ? (
            <p className="text-center text-slate-400 py-12">No hay servicios disponibles</p>
          ) : (
            services.map((s) => (
              <button
                key={s.id}
                onClick={() => { setService(s); setStep("datetime"); }}
                className="w-full text-left p-5 hover:bg-slate-50 transition-colors group flex items-start gap-4"
              >
                <span className="w-3 h-3 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: s.color }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-slate-900 font-semibold">{s.name}</span>
                  <span className="block text-slate-500 text-sm mt-0.5">
                    {s.durationMin} min{s.price > 0 ? ` · $${s.price.toLocaleString("es-CO")}` : " · Gratis"}
                  </span>
                  {s.description && (
                    <span className="block text-slate-400 text-sm mt-1 line-clamp-2">{s.description}</span>
                  )}
                </span>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-500 mt-1 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  if (!service) return null;

  // Panel izquierdo con info del servicio (compartido entre datetime y details)
  const infoPanel = (
    <div className="md:w-72 shrink-0 p-6 md:border-r border-b md:border-b-0 border-slate-200">
      <button
        onClick={() => {
          if (step === "details") { setStep("datetime"); }
          else if (services.length > 1) { setStep("service"); setService(null); setSelectedDate(null); setSelectedSlot(null); }
        }}
        className={`mb-4 w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors ${
          step === "datetime" && services.length === 1 ? "invisible" : ""
        }`}
        aria-label="Volver"
      >
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="mb-3">{tenantAvatar}</div>
      <p className="text-slate-500 text-sm font-medium">{tenant.name}</p>
      <h1 className="text-xl font-bold text-slate-900 mt-1 leading-snug">{service.name}</h1>

      <div className="mt-4 space-y-2.5">
        <div className="flex items-center gap-2.5 text-slate-600 text-sm font-medium">
          <Clock className="w-4 h-4 text-slate-400" />
          {service.durationMin} min
        </div>
        {service.price > 0 && (
          <div className="flex items-center gap-2.5 text-slate-600 text-sm font-medium">
            <span className="text-slate-400 font-semibold w-4 text-center">$</span>
            {service.price.toLocaleString("es-CO")} COP
          </div>
        )}
        {step === "details" && selectedDate && selectedSlot && (
          <div className="flex items-start gap-2.5 text-sm font-medium" style={{ color: primary }}>
            <CalendarIcon className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="capitalize">
              {format(new Date(selectedSlot.datetime), "h:mm a")},{" "}
              {format(selectedDate, "EEEE d 'de' MMMM yyyy", { locale: es })}
            </span>
          </div>
        )}
      </div>

      {service.description && (
        <div className="mt-4">
          <p className={`text-slate-500 text-sm leading-relaxed ${showFullDesc ? "" : "line-clamp-4"}`}>
            {service.description}
          </p>
          {service.description.length > 140 && (
            <button
              onClick={() => setShowFullDesc(!showFullDesc)}
              className="text-xs font-bold tracking-wide text-slate-700 mt-1.5 hover:underline"
            >
              {showFullDesc ? "VER MENOS" : "VER MÁS"}
            </button>
          )}
        </div>
      )}
    </div>
  );

  // ─── Paso 2: fecha y hora ───
  if (step === "datetime") {
    const canGoPrev = isSameMonth(viewMonth, today) === false && isBefore(today, viewMonth);
    const maxMonth = startOfMonth(addMonths(today, 3));

    return (
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-4xl mx-auto overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: primary }} />
        <div className="md:flex">
          {infoPanel}

          <div className="flex-1 p-6">
            <h2 className="text-slate-900 font-bold text-lg mb-4">Selecciona un día</h2>

            <div className={`md:flex md:gap-6 ${selectedDate ? "" : ""}`}>
              {/* Calendario */}
              <div className="flex-1">
                {staff.length > 1 && (
                  <div className="mb-4 flex gap-2 flex-wrap">
                    {staff.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStaff(selectedStaff?.id === s.id ? null : s)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                        style={
                          selectedStaff?.id === s.id
                            ? { backgroundColor: primary, borderColor: primary, color: "white" }
                            : { borderColor: "#e2e8f0", color: "#64748b" }
                        }
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setViewMonth(addMonths(viewMonth, -1))}
                    disabled={!canGoPrev}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <p className="text-slate-900 font-semibold capitalize">
                    {format(viewMonth, "MMMM yyyy", { locale: es })}
                  </p>
                  <button
                    onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                    disabled={!isBefore(viewMonth, maxMonth)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                    aria-label="Mes siguiente"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                  {WEEKDAY_HEADERS.map((d) => (
                    <span key={d} className="text-[11px] font-semibold text-slate-500 py-1">{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: calendarDays.offset }).map((_, i) => (
                    <span key={`pad-${i}`} />
                  ))}
                  {calendarDays.days.map((day) => {
                    const enabled = isDayEnabled(day);
                    const selected = selectedDate && isSameDay(day, selectedDate);
                    const isToday = isSameDay(day, today);
                    return (
                      <button
                        key={day.toISOString()}
                        onClick={() => enabled && setSelectedDate(day)}
                        disabled={!enabled}
                        className="relative aspect-square rounded-full text-sm font-semibold transition-colors flex items-center justify-center disabled:cursor-default"
                        style={
                          selected
                            ? { backgroundColor: primary, color: "white" }
                            : enabled
                            ? { backgroundColor: `${primary}14`, color: primary }
                            : { color: "#cbd5e1" }
                        }
                      >
                        {format(day, "d")}
                        {isToday && (
                          <span
                            className="absolute bottom-1 w-1 h-1 rounded-full"
                            style={{ backgroundColor: selected ? "white" : primary }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-5">
                  <p className="text-slate-900 text-sm font-bold mb-1">Zona horaria</p>
                  <p className="text-slate-500 text-sm flex items-center gap-2">
                    <Globe className="w-4 h-4" /> {timezone || "—"}
                  </p>
                </div>
              </div>

              {/* Horarios del día seleccionado */}
              {selectedDate && (
                <div className="md:w-52 mt-6 md:mt-0">
                  <p className="text-slate-900 font-semibold text-sm mb-3 capitalize">
                    {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
                  </p>
                  <div className="space-y-2 md:max-h-[340px] md:overflow-y-auto md:pr-1">
                    {slotsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                      </div>
                    ) : slots.length === 0 ? (
                      <p className="text-slate-400 text-sm py-6 text-center">
                        Sin horarios disponibles este día
                      </p>
                    ) : (
                      slots.map((slot) =>
                        selectedSlot?.datetime === slot.datetime ? (
                          <div key={slot.datetime} className="flex gap-2">
                            <span className="flex-1 py-2.5 rounded-lg text-sm font-bold text-center bg-slate-600 text-white">
                              {format(new Date(slot.datetime), "h:mm a")}
                            </span>
                            <button
                              onClick={() => setStep("details")}
                              className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white text-center transition-opacity hover:opacity-90"
                              style={{ backgroundColor: primary }}
                            >
                              Siguiente
                            </button>
                          </div>
                        ) : (
                          <button
                            key={slot.datetime}
                            onClick={() => setSelectedSlot(slot)}
                            className="w-full py-2.5 rounded-lg text-sm font-bold border transition-colors text-center hover:border-current"
                            style={{ borderColor: `${primary}55`, color: primary }}
                          >
                            {format(new Date(slot.datetime), "h:mm a")}
                          </button>
                        )
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Paso 3: datos del cliente + preguntas personalizadas ───
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-4xl mx-auto overflow-hidden">
      <div className="h-1.5" style={{ backgroundColor: primary }} />
      <div className="md:flex">
        {infoPanel}

        <div className="flex-1 p-6">
          <h2 className="text-slate-900 font-bold text-lg mb-5">Ingresa tus datos</h2>

          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-slate-900 text-sm font-semibold mb-1.5">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={info.name}
                onChange={(e) => setInfo({ ...info, name: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": primary } as React.CSSProperties}
              />
            </div>

            <div>
              <label className="block text-slate-900 text-sm font-semibold mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="email"
                value={info.email}
                onChange={(e) => setInfo({ ...info, email: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": primary } as React.CSSProperties}
              />
            </div>

            <div>
              <label className="block text-slate-900 text-sm font-semibold mb-1.5">Teléfono</label>
              <input
                type="tel"
                value={info.phone}
                onChange={(e) => setInfo({ ...info, phone: e.target.value })}
                placeholder="+57 300 000 0000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": primary } as React.CSSProperties}
              />
            </div>

            {/* Preguntas personalizadas del servicio */}
            {service.questions.map((q) => (
              <div key={q.id}>
                <label className="block text-slate-900 text-sm font-semibold mb-1.5">
                  {q.label} {q.required && <span className="text-red-500">*</span>}
                </label>

                {q.type === "radio" && (
                  <div className="space-y-2">
                    {(q.options || []).map((opt) => (
                      <label key={opt} className="flex items-center gap-2.5 cursor-pointer group">
                        <input
                          type="radio"
                          name={q.id}
                          value={opt}
                          checked={answers[q.id] === opt}
                          onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                          className="w-4 h-4"
                          style={{ accentColor: primary }}
                        />
                        <span className="text-slate-700 text-sm group-hover:text-slate-900">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === "text" && (
                  <input
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ "--tw-ring-color": primary } as React.CSSProperties}
                  />
                )}

                {q.type === "textarea" && (
                  <textarea
                    rows={3}
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent"
                    style={{ "--tw-ring-color": primary } as React.CSSProperties}
                  />
                )}
              </div>
            ))}

            <div>
              <label className="block text-slate-900 text-sm font-semibold mb-1.5">
                ¿Algo que debamos saber antes de tu cita?
              </label>
              <textarea
                rows={3}
                value={info.notes}
                onChange={(e) => setInfo({ ...info, notes: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ "--tw-ring-color": primary } as React.CSSProperties}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2.5">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="rounded-full px-7 py-3 text-white text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-2"
              style={{ backgroundColor: primary }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Agendar cita
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
