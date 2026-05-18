"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProjectCreateDialog } from "./project-create-dialog";
import { ProjectDetailDialog } from "./project-detail-dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faGripVertical, faPlus, faMoneyBill1Wave, faListCheck } from "@fortawesome/free-solid-svg-icons";
import { cn, formatPoints } from "@/lib/utils";

type Status = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

const COLUMNS: { id: Status; label: string }[] = [
  { id: "TODO", label: "To Do" },
  { id: "IN_PROGRESS", label: "Berjalan" },
  { id: "REVIEW", label: "Review" },
  { id: "DONE", label: "Selesai" },
];

export type ProjectCard = {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  budget: number;
  budgetUsed: number;
  position: number;
  dueAt: string | null;
  milestones: { id: string; title: string; done: boolean }[];
};

export function KanbanBoard({
  labId,
  projects,
  canManage,
}: {
  labId: string;
  projects: ProjectCard[];
  canManage: boolean;
}) {
  const [items, setItems] = useState<ProjectCard[]>(projects);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    setItems(projects);
  }, [projects]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const grouped = useMemo(() => {
    const map: Record<Status, ProjectCard[]> = { TODO: [], IN_PROGRESS: [], REVIEW: [], DONE: [] };
    for (const p of items) map[p.status].push(p);
    for (const k of Object.keys(map) as Status[]) map[k].sort((a, b) => a.position - b.position);
    return map;
  }, [items]);

  const activeProject = activeId ? items.find((i) => i.id === activeId) ?? null : null;

  function findContainer(id: string): Status | null {
    if ((COLUMNS as { id: string }[]).some((c) => c.id === id)) return id as Status;
    const card = items.find((i) => i.id === id);
    return card?.status ?? null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function onDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    setActiveId(null);
    if (!overId) return;

    const fromCol = findContainer(activeId);
    const toCol = findContainer(overId);
    if (!fromCol || !toCol) return;

    // Build new ordering
    let newItems = [...items];
    if (fromCol === toCol) {
      const colItems = grouped[fromCol];
      const oldIdx = colItems.findIndex((i) => i.id === activeId);
      const newIdx = colItems.findIndex((i) => i.id === overId);
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
      const reordered = arrayMove(colItems, oldIdx, newIdx).map((i, idx) => ({ ...i, position: idx }));
      newItems = items.map((i) => reordered.find((r) => r.id === i.id) ?? i);
    } else {
      const sourceItems = grouped[fromCol].filter((i) => i.id !== activeId);
      const targetItems = [...grouped[toCol]];
      const overIdx =
        overId === toCol ? targetItems.length : targetItems.findIndex((i) => i.id === overId);
      const moved = items.find((i) => i.id === activeId)!;
      const inserted = { ...moved, status: toCol };
      const insertAt = overIdx === -1 ? targetItems.length : overIdx;
      targetItems.splice(insertAt, 0, inserted);

      const sourceReindexed = sourceItems.map((i, idx) => ({ ...i, position: idx }));
      const targetReindexed = targetItems.map((i, idx) => ({ ...i, position: idx, status: toCol }));

      newItems = items.map((i) => {
        const found =
          sourceReindexed.find((s) => s.id === i.id) ?? targetReindexed.find((s) => s.id === i.id);
        return found ?? i;
      });
    }

    setItems(newItems);

    // Persist all changed projects in this column(s)
    const changed = newItems.filter((n) => {
      const old = items.find((o) => o.id === n.id);
      return old && (old.status !== n.status || old.position !== n.position);
    });

    try {
      await Promise.all(
        changed.map((p) =>
          fetch(`/api/projects/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: p.status, position: p.position }),
          })
        )
      );
    } catch {
      toast.error("Gagal menyimpan urutan. Memuat ulang…");
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <ProjectCreateDialog labId={labId} />
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="grid gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => (
            <Column key={col.id} id={col.id} label={col.label} items={grouped[col.id]} canManage={canManage} onOpen={setOpenProjectId} />
          ))}
        </div>
        <DragOverlay>{activeProject ? <ProjectChip project={activeProject} dragging /> : null}</DragOverlay>
      </DndContext>

      {openProjectId && (
        <ProjectDetailDialog
          projectId={openProjectId}
          canManage={canManage}
          project={items.find((i) => i.id === openProjectId)!}
          onClose={() => setOpenProjectId(null)}
        />
      )}
    </div>
  );
}

function Column({
  id,
  label,
  items,
  canManage,
  onOpen,
}: {
  id: Status;
  label: string;
  items: ProjectCard[];
  canManage: boolean;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { type: "column" } });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border bg-card p-3 flex flex-col min-h-[200px]",
        isOver && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{label}</h3>
        <Badge variant="outline">{items.length}</Badge>
      </div>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2 flex-1">
          {items.length === 0 && (
            <div className="text-xs text-muted-foreground py-6 text-center border border-dashed rounded-md">
              Drop di sini
            </div>
          )}
          {items.map((p) => (
            <DraggableCard key={p.id} project={p} canManage={canManage} onOpen={() => onOpen(p.id)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function DraggableCard({
  project,
  canManage,
  onOpen,
}: {
  project: ProjectCard;
  canManage: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: project.id,
    disabled: !canManage,
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  } as React.CSSProperties;

  return (
    <div ref={setNodeRef} style={style}>
      <ProjectChip project={project} onOpen={onOpen} dragHandle={canManage ? { attributes, listeners } : null} />
    </div>
  );
}

function ProjectChip({
  project,
  dragging,
  onOpen,
  dragHandle,
}: {
  project: ProjectCard;
  dragging?: boolean;
  onOpen?: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dragHandle?: { attributes: any; listeners: any } | null;
}) {
  const pct = project.budget === 0 ? 0 : Math.round((project.budgetUsed / project.budget) * 100);
  const doneCount = project.milestones.filter((m) => m.done).length;
  return (
    <Card className={cn("group", dragging && "shadow-lg")}>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start gap-2">
          {dragHandle && (
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing mt-0.5"
              aria-label="Geser"
              {...dragHandle.attributes}
              {...dragHandle.listeners}
            >
              <FontAwesomeIcon icon={faGripVertical} className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={onOpen}
            className="text-left text-sm font-medium hover:underline flex-1 min-w-0"
          >
            {project.title}
          </button>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <FontAwesomeIcon icon={faMoneyBill1Wave} className="h-3 w-3" />
          Rp {formatPoints(project.budgetUsed)} / Rp {formatPoints(project.budget)}
        </div>
        <Progress
          value={pct}
          className="h-1"
          indicatorClassName={pct > 90 ? "bg-destructive" : pct > 70 ? "bg-amber-500" : ""}
        />
        {project.milestones.length > 0 && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <FontAwesomeIcon icon={faListCheck} className="h-3 w-3" />
            {doneCount}/{project.milestones.length} milestone
          </div>
        )}
      </CardContent>
    </Card>
  );
}
