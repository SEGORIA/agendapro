"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { Calendar, Mail, Phone } from "lucide-react";
import axios from "axios";

interface Stage {
  id: string;
  name: string;
  color: string;
}

interface ClientCard {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  pipelineStageId: string | null;
  appointmentsCount: number;
}

export function PipelineBoard({ stages, clients }: { stages: Stage[]; clients: ClientCard[] }) {
  const [items, setItems] = useState(clients);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);

  function clientsForStage(stageId: string | null) {
    return items.filter((c) => c.pipelineStageId === stageId);
  }

  async function moveClient(clientId: string, stageId: string | null) {
    const client = items.find((c) => c.id === clientId);
    if (!client || client.pipelineStageId === stageId) return;

    setItems((prev) => prev.map((c) => (c.id === clientId ? { ...c, pipelineStageId: stageId } : c)));

    try {
      await axios.patch(`/api/clients/${clientId}`, { pipelineStageId: stageId });
    } catch {
      // revertir si falla
      setItems((prev) => prev.map((c) => (c.id === clientId ? { ...c, pipelineStageId: client.pipelineStageId } : c)));
    }
  }

  const unassigned = clientsForStage(null);

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {unassigned.length > 0 && (
        <PipelineColumn
          stage={{ id: "__none__", name: "Sin etapa", color: "#64748b" }}
          clients={unassigned}
          isOver={overStage === "__none__"}
          onDragStart={setDragId}
          onDragOver={() => setOverStage("__none__")}
          onDragLeave={() => setOverStage(null)}
          onDrop={() => {
            if (dragId) moveClient(dragId, null);
            setOverStage(null);
            setDragId(null);
          }}
        />
      )}
      {stages.map((stage) => (
        <PipelineColumn
          key={stage.id}
          stage={stage}
          clients={clientsForStage(stage.id)}
          isOver={overStage === stage.id}
          onDragStart={setDragId}
          onDragOver={() => setOverStage(stage.id)}
          onDragLeave={() => setOverStage(null)}
          onDrop={() => {
            if (dragId) moveClient(dragId, stage.id);
            setOverStage(null);
            setDragId(null);
          }}
        />
      ))}
    </div>
  );
}

function PipelineColumn({
  stage,
  clients,
  isOver,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  stage: Stage;
  clients: ClientCard[];
  isOver: boolean;
  onDragStart: (id: string) => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}) {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={`shrink-0 w-72 rounded-xl border transition-colors ${
        isOver ? "border-purple-500 bg-purple-500/5" : "border-slate-700 bg-slate-800/30"
      }`}
    >
      <div className="p-3 border-b border-slate-700 flex items-center justify-between sticky top-0">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="text-white text-sm font-medium">{stage.name}</h3>
        </div>
        <span className="text-slate-400 text-xs bg-slate-700/50 rounded-full px-2 py-0.5">{clients.length}</span>
      </div>
      <div className="p-2 space-y-2 min-h-[120px]">
        {clients.map((client) => (
          <Link
            key={client.id}
            href={`/clients/${client.id}`}
            draggable
            onDragStart={(e) => {
              onDragStart(client.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="block bg-slate-800 border border-slate-700 rounded-lg p-3 hover:border-slate-600 cursor-grab active:cursor-grabbing transition-colors"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="bg-slate-700 text-slate-300 text-[10px]">
                  {getInitials(client.name)}
                </AvatarFallback>
              </Avatar>
              <p className="text-white text-sm font-medium truncate">{client.name}</p>
            </div>
            {client.email && (
              <p className="text-slate-400 text-xs flex items-center gap-1 truncate">
                <Mail className="w-3 h-3 shrink-0" /> {client.email}
              </p>
            )}
            {client.phone && (
              <p className="text-slate-400 text-xs flex items-center gap-1 truncate">
                <Phone className="w-3 h-3 shrink-0" /> {client.phone}
              </p>
            )}
            {client.appointmentsCount > 0 && (
              <p className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3" /> {client.appointmentsCount} citas
              </p>
            )}
          </Link>
        ))}
        {clients.length === 0 && (
          <div className="text-center py-6 text-slate-600 text-xs">Sin clientes</div>
        )}
      </div>
    </div>
  );
}
