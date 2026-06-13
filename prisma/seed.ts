import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const PIPELINE_STAGES = [
  { name: "Nuevo",      color: "#6366f1", order: 0 },
  { name: "Contactado", color: "#f59e0b", order: 1 },
  { name: "Calificado", color: "#10b981", order: 2 },
  { name: "Propuesta",  color: "#3b82f6", order: 3 },
  { name: "Cliente",    color: "#22c55e", order: 4 },
  { name: "Cerrado",    color: "#6b7280", order: 5 },
];

async function main() {
  console.log("🌱 Iniciando seed...");

  // Tenant raíz
  const rootTenant = await prisma.tenant.upsert({
    where: { slug: "root" },
    update: {},
    create: { slug: "root", name: "AgendaPro HQ", sector: "general", plan: "enterprise" },
  });

  // Super admin
  const superAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: rootTenant.id, email: "admin@agendapro.com" } },
    update: {},
    create: {
      tenantId: rootTenant.id,
      name: "Super Admin",
      email: "admin@agendapro.com",
      password: await bcrypt.hash("admin123456", 12),
      role: "SUPER_ADMIN",
    },
  });
  console.log(`✅ Super Admin: ${superAdmin.email}`);

  // Tenant demo
  const demo = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: {
      slug: "demo",
      name: "Clínica Demo",
      sector: "medical",
      primaryColor: "#10b981",
      accentColor: "#f59e0b",
      plan: "pro",
    },
  });

  // Admin demo
  const demoAdmin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: demo.id, email: "admin@demo.com" } },
    update: {},
    create: {
      tenantId: demo.id,
      name: "Dr. Carlos López",
      email: "admin@demo.com",
      password: await bcrypt.hash("demo123456", 12),
      role: "ADMIN",
    },
  });
  console.log(`✅ Demo Admin: ${demoAdmin.email}`);

  // Servicios
  const existingSvcs = await prisma.service.count({ where: { tenantId: demo.id } });
  if (existingSvcs === 0) {
    await prisma.service.createMany({
      data: [
        { tenantId: demo.id, name: "Consulta inicial",         durationMin: 30, price: 80000,  color: "#10b981" },
        { tenantId: demo.id, name: "Consulta de seguimiento",  durationMin: 20, price: 60000,  color: "#3b82f6" },
        { tenantId: demo.id, name: "Revisión de resultados",   durationMin: 45, price: 100000, color: "#f59e0b" },
      ],
    });
  }

  // Disponibilidad lunes–viernes
  for (const day of [1, 2, 3, 4, 5]) {
    const existing = await prisma.availabilityRule.findFirst({
      where: { tenantId: demo.id, dayOfWeek: day, userId: null },
    });
    if (!existing) {
      await prisma.availabilityRule.create({
        data: { tenantId: demo.id, dayOfWeek: day, startTime: "08:00", endTime: "18:00" },
      });
    }
  }

  // Pipeline stages
  const stagesCount = await prisma.pipelineStage.count({ where: { tenantId: demo.id } });
  if (stagesCount === 0) {
    await prisma.pipelineStage.createMany({
      data: PIPELINE_STAGES.map(s => ({ ...s, tenantId: demo.id })),
    });
  }

  // Clientes de muestra
  const firstStage = await prisma.pipelineStage.findFirst({
    where: { tenantId: demo.id }, orderBy: { order: "asc" },
  });
  const clientsCount = await prisma.client.count({ where: { tenantId: demo.id } });
  if (clientsCount === 0) {
    const clientsData = [
      { name: "María García",    email: "maria@email.com",   phone: "+57 300 111 2233" },
      { name: "Carlos Rodríguez",email: "carlos@email.com",  phone: "+57 310 222 3344" },
      { name: "Ana Martínez",    email: "ana@email.com",     phone: "+57 320 333 4455" },
      { name: "Luis Pérez",      email: "luis@email.com",    phone: "+57 315 444 5566" },
    ];
    for (const c of clientsData) {
      await prisma.client.create({
        data: { ...c, tenantId: demo.id, source: "BOOKING", pipelineStageId: firstStage?.id },
      });
    }
  }

  // Citas de muestra
  const service = await prisma.service.findFirst({ where: { tenantId: demo.id } });
  const clients = await prisma.client.findMany({ where: { tenantId: demo.id }, take: 4 });
  const aptsCount = await prisma.appointment.count({ where: { tenantId: demo.id } });
  if (aptsCount === 0 && service && clients.length > 0) {
    const now = new Date();
    const apts = [
      { clientIdx: 0, daysOffset: 0,  hours: 9,  status: "CONFIRMED" },
      { clientIdx: 1, daysOffset: 0,  hours: 11, status: "PENDING"   },
      { clientIdx: 2, daysOffset: 1,  hours: 10, status: "CONFIRMED" },
      { clientIdx: 3, daysOffset: -1, hours: 14, status: "COMPLETED" },
      { clientIdx: 0, daysOffset: 2,  hours: 15, status: "PENDING"   },
    ];
    for (const a of apts) {
      const startsAt = new Date(now);
      startsAt.setDate(now.getDate() + a.daysOffset);
      startsAt.setHours(a.hours, 0, 0, 0);
      const endsAt = new Date(startsAt);
      endsAt.setMinutes(endsAt.getMinutes() + service.durationMin);
      await prisma.appointment.create({
        data: {
          tenantId: demo.id,
          clientId: clients[a.clientIdx % clients.length].id,
          serviceId: service.id,
          staffId: demoAdmin.id,
          startsAt, endsAt,
          status: a.status as any,
        },
      });
    }
  }

  console.log(`\n🎉 Seed completado!`);
  console.log(`\n📝 Credenciales:`);
  console.log(`   Super Admin: admin@agendapro.com / admin123456`);
  console.log(`   Demo Admin:  admin@demo.com / demo123456`);
  console.log(`   Booking:     http://localhost:3000/booking/demo`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
