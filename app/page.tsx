import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Zap, Shield } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
      {/* Navbar */}
      <nav className="border-b border-white/10 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-lg">AgendaPro</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="text-white/70 hover:text-white hover:bg-white/10">
                Iniciar sesión
              </Button>
            </Link>
            <Link href="/admin">
              <Button className="bg-purple-600 hover:bg-purple-500 text-white">
                Panel Admin
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1.5 text-sm text-purple-300 mb-8">
          <Zap className="w-3.5 h-3.5" />
          Plataforma white-label de agendamiento
        </div>
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
          Agenda inteligente
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            para tu negocio
          </span>
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
          Gestiona citas, leads y clientes en una sola plataforma.
          Personalizada con tu marca. Lista en minutos.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/admin">
            <Button size="lg" className="bg-purple-600 hover:bg-purple-500 text-white h-12 px-8">
              Comenzar ahora
            </Button>
          </Link>
          <Link href="#features">
            <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10 h-12 px-8">
              Ver características
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Calendar,
              title: "Agendamiento inteligente",
              desc: "Calendario visual, slots automáticos, confirmaciones y recordatorios.",
              color: "text-purple-400",
              bg: "bg-purple-500/10 border-purple-500/20",
            },
            {
              icon: Users,
              title: "CRM integrado",
              desc: "Pipeline de leads, historial de clientes y seguimiento completo.",
              color: "text-blue-400",
              bg: "bg-blue-500/10 border-blue-500/20",
            },
            {
              icon: Zap,
              title: "Automatizaciones",
              desc: "Flujos automáticos: recordatorios, follow-ups, notificaciones.",
              color: "text-yellow-400",
              bg: "bg-yellow-500/10 border-yellow-500/20",
            },
            {
              icon: Shield,
              title: "White-label",
              desc: "Tu logo, tus colores, tu dominio. 100% personalizable.",
              color: "text-green-400",
              bg: "bg-green-500/10 border-green-500/20",
            },
          ].map((f) => (
            <div
              key={f.title}
              className={`rounded-2xl border p-6 ${f.bg} backdrop-blur-sm`}
            >
              <f.icon className={`w-8 h-8 ${f.color} mb-4`} />
              <h3 className="text-white font-semibold mb-2">{f.title}</h3>
              <p className="text-white/50 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-white/30 text-sm">
        <p>© 2025 AgendaPro — Construido con Next.js + Prisma</p>
      </footer>
    </main>
  );
}
