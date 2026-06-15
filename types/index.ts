import type {
  Tenant, User, Service, Client, Appointment,
  PipelineStage, Automation, UserRole, AppointmentStatus
} from "@prisma/client";

// Re-exportar tipos de Prisma
export type { Tenant, User, Service, Client, Appointment, PipelineStage, Automation, UserRole, AppointmentStatus };

// ─────────────────────────────────────────
// Tipos extendidos con relaciones
// ─────────────────────────────────────────

export type AppointmentWithRelations = Appointment & {
  client: Client;
  staff?: User | null;
  service?: Service | null;
};

export type ClientWithRelations = Client & {
  pipelineStage?: PipelineStage | null;
  appointments?: Appointment[];
};

export type TenantWithStats = Tenant & {
  _count: {
    users: number;
    clients: number;
    appointments: number;
  };
};

// ─────────────────────────────────────────
// Session extendida
// ─────────────────────────────────────────

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
      tenantId: string;
      tenantSlug: string;
      impersonating?: boolean;
      originalTenantId?: string;
      originalTenantSlug?: string;
    };
  }
}

// ─────────────────────────────────────────
// Tipos de respuesta API
// ─────────────────────────────────────────

export type ApiResponse<T = unknown> = {
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

// ─────────────────────────────────────────
// Tipos de formulario
// ─────────────────────────────────────────

export type CreateAppointmentInput = {
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  serviceId: string;
  staffId?: string;
  startsAt: string;
  notes?: string;
};

export type CreateClientInput = {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  notes?: string;
  pipelineStageId?: string;
  tags?: string[];
};

export type AutomationAction = {
  type: "send_email" | "send_whatsapp" | "move_pipeline" | "assign_task" | "create_note";
  config: Record<string, unknown>;
};

export type AutomationConfig = {
  id: string;
  name: string;
  triggerEvent: string;
  triggerConfig: Record<string, unknown>;
  actions: AutomationAction[];
  isActive: boolean;
};

// ─────────────────────────────────────────
// Tipos de disponibilidad / slots
// ─────────────────────────────────────────

export type TimeSlot = {
  time: string;       // "09:00"
  datetime: string;   // ISO string
  available: boolean;
};

export type DayAvailability = {
  date: string;       // "2024-01-15"
  slots: TimeSlot[];
};
