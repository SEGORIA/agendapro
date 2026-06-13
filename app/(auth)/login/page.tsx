import { Suspense } from "react";
import LoginForm from "./login-form";
import { Calendar } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-purple-600 mb-4">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Iniciar sesión</h1>
          <p className="text-slate-400 text-sm mt-1">Bienvenido de nuevo</p>
        </div>
        <Suspense fallback={<div className="text-slate-400 text-center">Cargando...</div>}>
          <LoginForm />
        </Suspense>
        <p className="text-center text-slate-500 text-xs mt-6">
          ¿Problemas para ingresar? Contacta a tu administrador.
        </p>
      </div>
    </div>
  );
}
