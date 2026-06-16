"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, X, Loader2, Check, Building2, Phone } from "lucide-react";
import { getInitials, getErrorMessage } from "@/lib/utils";

const MAX_LOGO_BYTES = 1_000_000;
const MAX_COVER_BYTES = 1_600_000;

export interface TenantBranding {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  customDomain: string | null;
  coverImageUrl: string | null;
  whatsappNumber: string | null;
  contactEmail: string | null;
  website: string | null;
}

export function BrandingForm({ tenant }: { tenant: TenantBranding }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(tenant.name);
  const [primaryColor, setPrimaryColor] = useState(tenant.primaryColor);
  const [accentColor, setAccentColor] = useState(tenant.accentColor);
  const [customDomain, setCustomDomain] = useState(tenant.customDomain || "");
  const [logoUrl, setLogoUrl] = useState<string | null>(tenant.logoUrl);
  const [logoChanged, setLogoChanged] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(tenant.coverImageUrl);
  const [coverChanged, setCoverChanged] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState(tenant.whatsappNumber || "");
  const [contactEmail, setContactEmail] = useState(tenant.contactEmail || "");
  const [website, setWebsite] = useState(tenant.website || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!/^image\/(png|jpeg|jpg|svg\+xml|webp)$/.test(file.type)) {
      setError("Formato no soportado. Usa PNG, JPG, SVG o WEBP.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("La imagen debe ser menor a 1MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setLogoUrl(reader.result as string); setLogoChanged(true); setSuccess(false); };
    reader.readAsDataURL(file);
  }

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (!/^image\/(png|jpeg|jpg|svg\+xml|webp)$/.test(file.type)) {
      setError("Formato no soportado. Usa PNG, JPG, SVG o WEBP.");
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      setError("La imagen de portada debe ser menor a 1.5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => { setCoverImageUrl(reader.result as string); setCoverChanged(true); setSuccess(false); };
    reader.readAsDataURL(file);
  }

  function handleRemoveLogo() {
    setLogoUrl(null);
    setLogoChanged(true);
    setSuccess(false);
  }

  function handleRemoveCover() {
    setCoverImageUrl(null);
    setCoverChanged(true);
    setSuccess(false);
  }

  async function handleSave() {
    if (name.trim().length < 2) {
      setError("El nombre del negocio es requerido");
      return;
    }
    setError("");
    setSuccess(false);
    setSaving(true);
    try {
      await axios.patch("/api/tenant", {
        name: name.trim(),
        primaryColor,
        accentColor,
        customDomain: customDomain.trim() || null,
        ...(logoChanged ? { logoUrl } : {}),
        ...(coverChanged ? { coverImageUrl } : {}),
        whatsappNumber: whatsappNumber.trim() || null,
        contactEmail: contactEmail.trim() || null,
        website: website.trim() || null,
      });
      setLogoChanged(false);
      setCoverChanged(false);
      setSuccess(true);
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Error al guardar los cambios"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Logo */}
      <div>
        <label className="text-slate-300 text-sm font-medium block mb-2">Logo de la marca</label>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-16 w-16 rounded-xl object-cover border border-slate-600 bg-slate-900" />
            ) : (
              <div className="h-16 w-16 rounded-xl flex items-center justify-center text-white text-lg font-bold border border-slate-600" style={{ backgroundColor: primaryColor }}>
                {getInitials(name || "Negocio")}
              </div>
            )}
            {logoUrl && (
              <button type="button" onClick={handleRemoveLogo} className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-300 hover:text-red-400 hover:border-red-400 transition-colors" aria-label="Quitar logo">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              <ImagePlus className="w-3.5 h-3.5" /> {logoUrl ? "Cambiar logo" : "Subir logo"}
            </Button>
            <p className="text-slate-500 text-xs">PNG, JPG, SVG o WEBP · máx. 1MB</p>
          </div>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      {/* Imagen de portada */}
      <div>
        <label className="text-slate-300 text-sm font-medium block mb-2">
          Imagen de portada <span className="text-slate-500 text-xs">(banner visible en tu página de reservas)</span>
        </label>
        {coverImageUrl ? (
          <div className="relative w-full rounded-xl overflow-hidden border border-slate-600 mb-2" style={{ maxHeight: "120px" }}>
            <img src={coverImageUrl} alt="Portada" className="w-full object-cover" style={{ maxHeight: "120px" }} />
            <button type="button" onClick={handleRemoveCover} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-slate-800/80 border border-slate-600 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors" aria-label="Quitar portada">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => coverFileInputRef.current?.click()} className="w-full h-20 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center text-slate-500 text-sm cursor-pointer hover:border-slate-400 hover:text-slate-400 transition-colors mb-2">
            <ImagePlus className="w-4 h-4 mr-2" /> Subir imagen de portada
          </button>
        )}
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => coverFileInputRef.current?.click()} className="border-slate-600 text-slate-300 hover:bg-slate-700">
            <ImagePlus className="w-3.5 h-3.5" /> {coverImageUrl ? "Cambiar portada" : "Subir portada"}
          </Button>
          <p className="text-slate-500 text-xs">PNG, JPG o WEBP · máx. 1.5MB · recomendado 1200×400px</p>
        </div>
        <input ref={coverFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleCoverChange} />
      </div>

      {/* Nombre + dominio */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-slate-300 text-sm font-medium block mb-1.5">Nombre del negocio</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-slate-900 border-slate-600 text-white" />
        </div>
        <div>
          <label className="text-slate-300 text-sm font-medium block mb-1.5">Dominio personalizado</label>
          <Input value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="agenda.tuempresa.com" className="bg-slate-900 border-slate-600 text-white" />
        </div>
      </div>

      {/* Colores */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-slate-300 text-sm font-medium block mb-1.5">Color primario</label>
          <div className="flex items-center gap-3">
            <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-10 rounded-lg border border-slate-600 cursor-pointer bg-transparent shrink-0" />
            <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="bg-slate-900 border-slate-600 text-white font-mono" />
          </div>
        </div>
        <div>
          <label className="text-slate-300 text-sm font-medium block mb-1.5">Color acento</label>
          <div className="flex items-center gap-3">
            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-10 h-10 rounded-lg border border-slate-600 cursor-pointer bg-transparent shrink-0" />
            <Input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="bg-slate-900 border-slate-600 text-white font-mono" />
          </div>
        </div>
      </div>
      <p className="text-slate-500 text-xs -mt-2">
        Apunta un CNAME a <code className="text-purple-400">cname.agendapro.com</code>
      </p>

      {/* Información de contacto */}
      <div className="border-t border-slate-700 pt-5">
        <p className="text-slate-300 text-sm font-medium mb-1 flex items-center gap-2">
          <Phone className="w-4 h-4 text-green-400" />
          Información de contacto para clientes
        </p>
        <p className="text-slate-500 text-xs mb-3">Aparecerán en tu página de reservas para que los clientes puedan contactarte.</p>
        <div className="space-y-3">
          <div>
            <label className="text-slate-300 text-xs font-medium block mb-1.5">WhatsApp</label>
            <Input
              value={whatsappNumber}
              onChange={(e) => { setWhatsappNumber(e.target.value); setSuccess(false); }}
              placeholder="+57 300 123 4567"
              className="bg-slate-900 border-slate-600 text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 text-xs font-medium block mb-1.5">Email de contacto</label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => { setContactEmail(e.target.value); setSuccess(false); }}
                placeholder="hola@tunegocio.com"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
            <div>
              <label className="text-slate-300 text-xs font-medium block mb-1.5">Sitio web</label>
              <Input
                value={website}
                onChange={(e) => { setWebsite(e.target.value); setSuccess(false); }}
                placeholder="https://tunegocio.com"
                className="bg-slate-900 border-slate-600 text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vista previa */}
      <div>
        <p className="text-slate-300 text-sm font-medium mb-2">Vista previa</p>
        <div className="rounded-xl border border-slate-700 p-4 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${primaryColor}1a 0%, ${accentColor}1a 100%)` }}>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-10 w-10 rounded-lg object-cover" />
          ) : (
            <div className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: primaryColor }}>
              {getInitials(name || "Negocio")}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{name || "Tu negocio"}</p>
            <p className="text-slate-400 text-xs">Así se verá tu marca para tus clientes</p>
          </div>
          <span className="shrink-0 text-xs font-semibold text-white px-3 py-1.5 rounded-lg" style={{ backgroundColor: primaryColor }}>
            Agendar
          </span>
          <span className="shrink-0 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: accentColor }} title="Color acento" />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2">{error}</div>
      )}
      {success && (
        <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm rounded-lg px-3 py-2">
          <Check className="w-3.5 h-3.5" /> Cambios guardados
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="bg-purple-600 hover:bg-purple-500">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4" />}
          Guardar cambios
        </Button>
      </div>
    </div>
  );
}
