import { Suspense } from "react";
import LoginForm from "./login-form";
import { CalendarDays } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Glows decorativos */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-purple-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-indigo-600/20 blur-3xl" />

      <div className="w-full max-w-sm relative">
        {/* Marca */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 mb-6">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-600/30">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">AgendaPro</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Bienvenido de nuevo</h1>
          <p className="text-slate-400 text-sm mt-1.5">Ingresa para gestionar tu agenda</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 shadow-2xl shadow-black/40">
          <Suspense fallback={<div className="text-slate-400 text-center text-sm">Cargando...</div>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="text-center text-slate-500 text-xs mt-6">
          ¿Problemas para ingresar? Contacta a tu administrador.
        </p>
      </div>
    </div>
  );
}
