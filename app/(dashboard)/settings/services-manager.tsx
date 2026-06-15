"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPE_LABELS, type BookingQuestion } from "@/lib/booking";
import { Loader2, Plus, Trash2, MessageCircleQuestion, GripVertical, ImagePlus, X } from "lucide-react";
import axios from "axios";

const MAX_SERVICE_IMAGE_BYTES = 1_000_000;

export interface ServiceData {
  id: string;
  name: string;
  description: string | null;
  durationMin: number;
  price: number;
  color: string;
  isActive: boolean;
  questions: BookingQuestion[];
  imageUrl: string | null;
}

interface FormState {
  name: string;
  description: string;
  durationMin: number;
  price: number;
  color: string;
  questions: EditableQuestion[];
  imageUrl: string | null;
}

// En el editor las opciones de radio se manejan como texto separado por comas
interface EditableQuestion {
  id: string;
  label: string;
  type: BookingQuestion["type"];
  optionsText: string;
  required: boolean;
}

function toFormState(svc?: ServiceData): FormState {
  return {
    name: svc?.name ?? "",
    description: svc?.description ?? "",
    durationMin: svc?.durationMin ?? 30,
    price: svc?.price ?? 0,
    color: svc?.color ?? "#6366f1",
    imageUrl: svc?.imageUrl ?? null,
    questions: (svc?.questions ?? []).map((q) => ({
      id: q.id,
      label: q.label,
      type: q.type,
      optionsText: (q.options || []).join(", "),
      required: q.required ?? false,
    })),
  };
}

function toPayload(form: FormState, imageChanged: boolean) {
  return {
    name: form.name,
    description: form.description,
    durationMin: Number(form.durationMin),
    price: Number(form.price),
    color: form.color,
    bookingQuestions: form.questions
      .filter((q) => q.label.trim())
      .map((q) => ({
        id: q.id,
        label: q.label.trim(),
        type: q.type,
        ...(q.type === "radio" && {
          options: q.optionsText.split(",").map((o) => o.trim()).filter(Boolean),
        }),
        required: q.required,
      })),
    ...(imageChanged ? { imageUrl: form.imageUrl } : {}),
  };
}

export function ServicesManager({ services }: { services: ServiceData[] }) {
  const router = useRouter();
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(toFormState());
  const [imageChanged, setImageChanged] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function openEditor(svc?: ServiceData) {
    setForm(toFormState(svc));
    setEditingId(svc?.id ?? "new");
    setImageChanged(false);
    setError("");
  }

  function closeEditor() {
    setEditingId(null);
    setError("");
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!/^image\/(png|jpeg|jpg|webp)$/.test(file.type)) {
      setError("Formato no soportado. Usa PNG, JPG o WEBP.");
      return;
    }
    if (file.size > MAX_SERVICE_IMAGE_BYTES) {
      setError("La imagen debe ser menor a 1MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({ ...f, imageUrl: reader.result as string }));
      setImageChanged(true);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setForm((f) => ({ ...f, imageUrl: null }));
    setImageChanged(true);
  }

  function addQuestion() {
    setForm({
      ...form,
      questions: [
        ...form.questions,
        { id: crypto.randomUUID(), label: "", type: "radio", optionsText: "", required: true },
      ],
    });
  }

  function updateQuestion(id: string, patch: Partial<EditableQuestion>) {
    setForm({ ...form, questions: form.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) });
  }

  function removeQuestion(id: string) {
    setForm({ ...form, questions: form.questions.filter((q) => q.id !== id) });
  }

  async function handleSave() {
    setError("");
    if (form.name.trim().length < 2) {
      setError("El nombre del servicio es requerido");
      return;
    }
    for (const q of form.questions) {
      if (q.label.trim() && q.type === "radio" && !q.optionsText.trim()) {
        setError(`La pregunta "${q.label}" necesita opciones (separadas por coma)`);
        return;
      }
    }

    setSaving(true);
    try {
      if (editingId === "new") {
        await axios.post("/api/services", toPayload(form, imageChanged));
      } else {
        await axios.patch(`/api/services/${editingId}`, toPayload(form, imageChanged));
      }
      closeEditor();
      router.refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al guardar el servicio");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(svc: ServiceData) {
    await axios.patch(`/api/services/${svc.id}`, { isActive: !svc.isActive });
    router.refresh();
  }

  const editor = (
    <div className="bg-slate-900/60 border border-slate-600 rounded-xl p-4 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-slate-300 text-xs font-medium block mb-1">Nombre</label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej: Asesoría inicial 15 min"
            className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
          />
        </div>
        <div>
          <label className="text-slate-300 text-xs font-medium block mb-1">Duración (minutos)</label>
          <Input
            type="number"
            min={5}
            max={480}
            value={form.durationMin}
            onChange={(e) => setForm({ ...form, durationMin: Number(e.target.value) })}
            className="bg-slate-800 border-slate-600 text-white"
          />
        </div>
        <div>
          <label className="text-slate-300 text-xs font-medium block mb-1">Precio (0 = gratis)</label>
          <Input
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            className="bg-slate-800 border-slate-600 text-white"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-slate-300 text-xs font-medium block mb-1">
            Descripción <span className="text-slate-500">(visible en tu página de reservas)</span>
          </label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Cuéntale a tus clientes qué incluye este servicio"
            className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="flex items-end gap-4">
          <div>
            <label className="text-slate-300 text-xs font-medium block mb-1">Color</label>
            <input
              type="color"
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="w-16 h-9 rounded-lg border border-slate-600 cursor-pointer bg-slate-800"
            />
          </div>
        </div>
        {/* Imagen del servicio */}
        <div>
          <label className="text-slate-300 text-xs font-medium block mb-1">
            Imagen <span className="text-slate-500">(opcional)</span>
          </label>
          <div className="flex items-center gap-3">
            {form.imageUrl ? (
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-600 shrink-0">
                <img src={form.imageUrl} alt="Imagen" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute inset-0 flex items-center justify-center bg-slate-900/60 opacity-0 hover:opacity-100 text-red-400 transition-opacity"
                  aria-label="Quitar imagen"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageFileInputRef.current?.click()}
                className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 hover:border-slate-400 hover:text-slate-400 transition-colors shrink-0"
              >
                <ImagePlus className="w-5 h-5" />
              </button>
            )}
            <div className="space-y-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => imageFileInputRef.current?.click()}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <ImagePlus className="w-3.5 h-3.5" /> {form.imageUrl ? "Cambiar" : "Subir"}
              </Button>
              <p className="text-slate-500 text-xs">PNG, JPG · máx. 1MB</p>
            </div>
          </div>
          <input
            ref={imageFileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>
      </div>

      {/* Preguntas personalizadas */}
      <div className="border-t border-slate-700 pt-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-white text-sm font-medium flex items-center gap-2">
            <MessageCircleQuestion className="w-4 h-4 text-purple-400" />
            Preguntas para tus clientes
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addQuestion}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Plus className="w-3.5 h-3.5" /> Agregar pregunta
          </Button>
        </div>
        <p className="text-slate-500 text-xs mb-3">
          Se mostrarán en el formulario de reserva. Úsalas para calificar al cliente antes de la cita.
        </p>

        {form.questions.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-3 bg-slate-800/50 rounded-lg">
            Sin preguntas. Ej: &quot;¿Qué estás buscando?&quot; con opciones Comprar, Vender, Rentar.
          </p>
        ) : (
          <div className="space-y-3">
            {form.questions.map((q) => (
              <div key={q.id} className="bg-slate-800/70 border border-slate-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-slate-600 shrink-0" />
                  <Input
                    value={q.label}
                    onChange={(e) => updateQuestion(q.id, { label: e.target.value })}
                    placeholder="Escribe la pregunta"
                    className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 flex-1"
                  />
                  <Select value={q.type} onValueChange={(v) => updateQuestion(q.id, { type: v as BookingQuestion["type"] })}>
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-white w-40 shrink-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => removeQuestion(q.id)}
                    className="text-slate-500 hover:text-red-400 transition-colors shrink-0"
                    aria-label="Eliminar pregunta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {q.type === "radio" && (
                  <Input
                    value={q.optionsText}
                    onChange={(e) => updateQuestion(q.id, { optionsText: e.target.value })}
                    placeholder="Opciones separadas por coma. Ej: Comprar, Vender, Rentar"
                    className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500"
                  />
                )}
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => updateQuestion(q.id, { required: e.target.checked })}
                    className="w-3.5 h-3.5 accent-purple-500"
                  />
                  <span className="text-slate-400 text-xs">Respuesta obligatoria</span>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={closeEditor} className="border-slate-600 text-slate-300 hover:bg-slate-700">
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-500">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId === "new" ? "Crear servicio" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {services.length === 0 && editingId !== "new" && (
        <p className="text-slate-400 text-sm text-center py-6">Sin servicios configurados</p>
      )}

      {services.map((svc) => (
        <div key={svc.id}>
          {editingId === svc.id ? (
            editor
          ) : (
            <div className={`flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg ${!svc.isActive ? "opacity-50" : ""}`}>
              {svc.imageUrl ? (
                <img src={svc.imageUrl} alt={svc.name} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-600" />
              ) : (
                <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: svc.color }} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">
                  {svc.name}
                  {!svc.isActive && <span className="text-slate-500 text-xs ml-2">(inactivo)</span>}
                </p>
                <p className="text-slate-400 text-xs">
                  {svc.durationMin} min · {svc.price > 0 ? `$${svc.price.toLocaleString("es-CO")}` : "Gratis"}
                  {svc.questions.length > 0 && (
                    <span className="text-purple-400"> · {svc.questions.length} pregunta{svc.questions.length > 1 ? "s" : ""}</span>
                  )}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => toggleActive(svc)} className="text-slate-400 hover:text-white shrink-0">
                {svc.isActive ? "Desactivar" : "Activar"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => openEditor(svc)} className="text-slate-400 hover:text-white shrink-0">
                Editar
              </Button>
            </div>
          )}
        </div>
      ))}

      {editingId === "new" ? (
        editor
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => openEditor()}
          className="w-full border-dashed border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <Plus className="w-4 h-4" /> Agregar servicio
        </Button>
      )}
    </div>
  );
}
