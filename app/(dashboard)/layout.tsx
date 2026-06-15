import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SessionProvider } from "next-auth/react";
import { Sidebar } from "@/components/shared/sidebar";
import { NotificationBell } from "@/components/shared/notification-bell";
import { ImpersonationBanner } from "@/components/shared/impersonation-banner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // Obtener datos del tenant y usuario
  const [tenant, user] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: session.user.tenantId },
      select: { name: true, logoUrl: true, primaryColor: true, slug: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, avatarUrl: true },
    }),
  ]);

  if (!tenant) redirect("/login");

  return (
    <SessionProvider session={session}>
      <div className="flex h-screen bg-slate-900 overflow-hidden">
        <Sidebar tenant={tenant} user={user || {}} role={session.user.role} />
        <main className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between px-8 py-3 border-b border-slate-800 sticky top-0 bg-slate-900/80 backdrop-blur-sm z-40">
            <div>
              <ImpersonationBanner impersonating={!!session.user.impersonating} tenantName={tenant.name} />
            </div>
            <NotificationBell />
          </div>
          <div className="p-8">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}
