"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, Search, X, Clock } from "lucide-react";
import { format, addDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { getErrorMessage } from "@/lib/utils";
import axios from "axios";

interface Service {
  id: string;
  name: string;
  durationMin: number;
  price: number;
  currency: string;
}

interface Staff {
  id: string;
  name: string;
}

interface ClientOption {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Slot {
  time: string;
  datetime: string;
  available: boolean;
}

export function NewAppointmentForm({
  tenantId,
  services,
  staff,
  clients,
  preselectedClient,
}: {
  tenantId: string;
  services: Service[];
  staff: Staff[];
  clients: ClientOption[];
  preselectedClient: ClientOption | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Cliente
  const [clientMode, setClientMode] = useState<"existing" | "new">(preselectedClient ? "existing" : "existing");
  const [selectedClient, setSelectedClient] = useState<ClientOption | null>(preselectedClient);
  const [clientSearch, setClientSearch] = useState("");
  const [newClient, setNewClient] = useState({ name: "", email: "", phone: "" });

  // Servicio / staff
  const [serviceId, setServiceId] = useState(services[0]?.id || "");
  const [staffId, setStaffId] = useState<string>("");

  // Fecha / hora
  const availableDays = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i)), []);
  const [selectedDate, setSelectedDate] = useState<Date>(availableDays[0]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [notes, setNotes] = useState("");

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients.slice(0, 8);
    const q = clientSearch.toLowerCase();
    return clients.filter(
      (c) => c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.phone?.includes(q)
    ).slice(0, 8);
  }, [clientSearch, clients]);

  const slotsDate = format(selectedDate, "yyyy-MM-dd");
  const { data: slots = [], isFetching: loadingSlots } = useQuery({
    queryKey: ["admin-slots", tenantId, serviceId, slotsDate, staffId || null],
    queryFn: async () => {
      const res = await axios.get("/api/slots", {
        params: { tenantId, serviceId, date: slotsDate, ...(staffId ? { staffId } : {}) },
      });
      return res.data.data as Slot[];
    },
    enabled: !!serviceId,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedSlot) {
      setError("Selecciona una fecha y hora disponible");
      return;
    }
    if (clientMode === "existing" && !selectedClient) {
      setError("Selecciona un cliente o crea uno nuevo");
      return;
    }
    if (clientMode === "new" && !newClient.name) {
      setError("Ingresa el nombre del cliente");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        serviceId,
        startsAt: selectedSlot.datetime,
        notes: notes || undefined,
        ...(staffId ? { staffId } : {}),
      };
      if (clientMode === "existing") {
        payload.clientId = selectedClient!.id;
      } else {
        payload.clientName = newClient.name;
        payload.clientEmail = newClient.email || undefined;
        payload.clientPhone = newClient.phone || undefined;
      }

      const res = await axios.post("/api/appointments", payload);
      router.push(`/appointments/${res.data.data.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Error al crear la cita"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Cliente */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-medium text-sm">Cliente</h2>
            <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setClientMode("existing")}
                className={`px-3 py-1.5 transition-colors ${clientMode === "existing" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Existente
              </button>
              <button
                type="button"
                onClick={() => { setClientMode("new"); setSelectedClient(null); }}
                className={`px-3 py-1.5 transition-colors ${clientMode === "new" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white"}`}
              >
                Nuevo
              </button>
            </div>
          </div>

          {clientMode === "existing" ? (
            <div className="space-y-2">
              {selectedClient ? (
                <div className="flex items-center justify-between bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-white text-sm font-medium">{selectedClient.name}</p>
                    <p className="text-slate-400 text-xs">{selectedClient.email || selectedClient.phone || ""}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedClient(null)} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Buscar por nombre, email o teléfono..."
                      className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500 pl-9"
                    />
                  </div>
                  {filteredClients.length > 0 && (
                    <div className="mt-2 border border-slate-700 rounded-lg divide-y divide-slate-700 overflow-hidden max-h-56 overflow-y-auto">
                      {filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setSelectedClient(c); setClientSearch(""); }}
                          className="w-full text-left px-3 py-2 hover:bg-slate-700/50 transition-colors"
                        >
                          <p className="text-white text-sm">{c.name}</p>
                          <p className="text-slate-400 text-xs">{c.email || c.phone || "Sin contacto"}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  {clients.length === 0 && (
                    <p className="text-slate-500 text-xs mt-2">No hay clientes registrados aún. Crea uno nuevo.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                placeholder="Nombre completo *"
                className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="Email"
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                />
                <Input
                  type="tel"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  placeholder="Teléfono"
                  className="bg-slate-900/50 border-slate-700 text-white placeholder:text-slate-500"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Servicio y staff */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-white font-medium text-sm">Servicio</h2>
          {services.length === 0 ? (
            <p className="text-slate-400 text-sm">No hay servicios configurados. Crea uno en Configuración.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-xs block mb-1.5">Servicio</label>
                <Select value={serviceId} onValueChange={(v) => { setServiceId(v); setSelectedSlot(null); }}>
                  <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} · {s.durationMin} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {staff.length > 0 && (
                <div>
                  <label className="text-slate-400 text-xs block mb-1.5">Atendido por</label>
                  <Select value={staffId || "any"} onValueChange={(v) => { setStaffId(v === "any" ? "" : v); setSelectedSlot(null); }}>
                    <SelectTrigger className="bg-slate-900/50 border-slate-700 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="any">Cualquiera disponible</SelectItem>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fecha y hora */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6 space-y-4">
          <h2 className="text-white font-medium text-sm">Fecha y hora</h2>

          <div className="grid grid-cols-7 gap-1">
            {availableDays.map((day) => (
              <button
                key={day.toISOString()}
                type="button"
                onClick={() => { setSelectedDate(day); setSelectedSlot(null); }}
                className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
                  selectedDate.toDateString() === day.toDateString()
                    ? "bg-purple-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <span className="text-xs">{format(day, "EEE", { locale: es }).slice(0, 3)}</span>
                <span className="text-base font-bold">{format(day, "d")}</span>
              </button>
            ))}
          </div>

          <div>
            {loadingSlots ? (
              <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando horarios...
              </div>
            ) : slots.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">No hay horarios disponibles este día</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot.datetime}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                      !slot.available
                        ? "bg-slate-900/30 text-slate-600 cursor-not-allowed line-through"
                        : selectedSlot?.datetime === slot.datetime
                        ? "bg-purple-600 text-white"
                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedSlot && (
            <p className="text-slate-400 text-xs flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })} a las {selectedSlot.time}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Notas */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-6 space-y-2">
          <h2 className="text-white font-medium text-sm">Notas (opcional)</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas internas sobre esta cita"
            rows={3}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Link href="/appointments" className="flex-1">
          <Button type="button" variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
            <ArrowLeft className="w-4 h-4" /> Cancelar
          </Button>
        </Link>
        <Button type="submit" disabled={loading || services.length === 0} className="flex-1 bg-purple-600 hover:bg-purple-500">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear cita"}
        </Button>
      </div>
    </form>
  );
}
