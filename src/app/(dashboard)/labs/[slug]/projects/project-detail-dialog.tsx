"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFloppyDisk, faPlus, faSpinner, faTrash, faXmark } from "@fortawesome/free-solid-svg-icons";
import type { ProjectCard } from "./kanban-board";
import { Progress } from "@/components/ui/progress";
import { formatPoints } from "@/lib/utils";

type Milestone = { id: string; title: string; done: boolean };

export function ProjectDetailDialog({
  project,
  canManage,
  onClose,
}: {
  projectId: string;
  project: ProjectCard;
  canManage: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description ?? "");
  const [budget, setBudget] = useState(project.budget);
  const [budgetUsed, setBudgetUsed] = useState(project.budgetUsed);
  const [milestones, setMilestones] = useState<Milestone[]>(project.milestones);
  const [newMilestone, setNewMilestone] = useState("");
  const [busy, setBusy] = useState(false);

  const pct = budget === 0 ? 0 : Math.round((budgetUsed / budget) * 100);

  async function saveProject() {
    setBusy(true);
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        description: description || null,
        budget,
        budgetUsed,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menyimpan.");
      return;
    }
    toast.success("Proker tersimpan.");
    router.refresh();
  }

  async function deleteProject() {
    if (!confirm("Hapus proker ini?")) return;
    setBusy(true);
    const res = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      toast.error("Gagal menghapus.");
      return;
    }
    toast.success("Proker dihapus.");
    onClose();
    router.refresh();
  }

  async function addMilestone() {
    if (newMilestone.trim().length < 2) return;
    const res = await fetch(`/api/projects/${project.id}/milestones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newMilestone.trim() }),
    });
    if (!res.ok) {
      toast.error("Gagal menambah milestone.");
      return;
    }
    const created = (await res.json()) as Milestone;
    setMilestones([...milestones, created]);
    setNewMilestone("");
    router.refresh();
  }

  async function toggleMilestone(m: Milestone) {
    const next = !m.done;
    setMilestones((arr) => arr.map((x) => (x.id === m.id ? { ...x, done: next } : x)));
    const res = await fetch(`/api/milestones/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: next }),
    });
    if (!res.ok) {
      setMilestones((arr) => arr.map((x) => (x.id === m.id ? { ...x, done: !next } : x)));
      toast.error("Gagal memperbarui milestone.");
    } else {
      router.refresh();
    }
  }

  async function removeMilestone(m: Milestone) {
    setMilestones((arr) => arr.filter((x) => x.id !== m.id));
    const res = await fetch(`/api/milestones/${m.id}`, { method: "DELETE" });
    if (!res.ok) {
      setMilestones((arr) => [...arr, m]);
      toast.error("Gagal menghapus milestone.");
    } else {
      router.refresh();
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{canManage ? "Edit proker" : "Detail proker"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="p-title">Judul</Label>
            <Input id="p-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canManage} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="p-desc">Deskripsi</Label>
            <Textarea id="p-desc" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canManage} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-budget">Budget (Rp)</Label>
            <Input
              id="p-budget"
              type="number"
              min={0}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value) || 0)}
              disabled={!canManage}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="p-used">Terpakai (Rp)</Label>
            <Input
              id="p-used"
              type="number"
              min={0}
              value={budgetUsed}
              onChange={(e) => setBudgetUsed(Number(e.target.value) || 0)}
              disabled={!canManage}
            />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Progress value={pct} indicatorClassName={pct > 90 ? "bg-destructive" : pct > 70 ? "bg-amber-500" : ""} />
            <p className="text-[11px] text-muted-foreground text-right">
              Rp {formatPoints(budgetUsed)} / Rp {formatPoints(budget)} ({pct}%)
            </p>
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label>Milestone</Label>
          <ul className="space-y-2">
            {milestones.map((m) => (
              <li key={m.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={m.done}
                  onChange={() => toggleMilestone(m)}
                  disabled={!canManage}
                  className="h-4 w-4 rounded border-input"
                />
                <span className={m.done ? "line-through text-muted-foreground text-sm flex-1" : "text-sm flex-1"}>
                  {m.title}
                </span>
                {canManage && (
                  <Button variant="ghost" size="icon" aria-label="Hapus" onClick={() => removeMilestone(m)}>
                    <FontAwesomeIcon icon={faXmark} className="h-3 w-3" />
                  </Button>
                )}
              </li>
            ))}
            {milestones.length === 0 && (
              <li className="text-xs text-muted-foreground">Belum ada milestone.</li>
            )}
          </ul>
          {canManage && (
            <div className="flex gap-2 pt-2">
              <Input
                placeholder="Milestone baru…"
                value={newMilestone}
                onChange={(e) => setNewMilestone(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMilestone();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={addMilestone} disabled={!newMilestone.trim()}>
                <FontAwesomeIcon icon={faPlus} />
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          {canManage && (
            <>
              <Button variant="destructive" onClick={deleteProject} disabled={busy}>
                <FontAwesomeIcon icon={faTrash} /> Hapus
              </Button>
              <Button onClick={saveProject} disabled={busy}>
                <FontAwesomeIcon icon={busy ? faSpinner : faFloppyDisk} className={busy ? "animate-spin" : ""} />
                Simpan
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
