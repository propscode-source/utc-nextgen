"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TiptapEditor } from "@/components/tiptap-editor";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFloppyDisk,
  faPaperPlane,
  faCircleCheck,
  faCircleXmark,
  faTrash,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

const VARIANTS: Record<string, "outline" | "info" | "success" | "destructive"> = {
  DRAFT: "outline",
  SUBMITTED: "info",
  APPROVED: "success",
  REJECTED: "destructive",
};

type Props = {
  torId: string;
  labSlug: string;
  initialTitle: string;
  initialStatus: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  initialContent: object;
  canEdit: boolean;
  canApprove: boolean;
};

export function TorEditorShell({
  torId,
  labSlug,
  initialTitle,
  initialStatus,
  initialContent,
  canEdit,
  canApprove,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState<object>(initialContent);
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState<null | "save" | "submit" | "approve" | "reject" | "delete">(null);

  async function update(patch: { title?: string; contentJson?: object; status?: typeof initialStatus }) {
    const res = await fetch(`/api/tor/${torId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(b.error || "Gagal memperbarui TOR.");
    }
  }

  async function save() {
    setBusy("save");
    try {
      await update({ title, contentJson: content });
      toast.success("Tersimpan.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function submit() {
    setBusy("submit");
    try {
      await update({ title, contentJson: content, status: "SUBMITTED" });
      setStatus("SUBMITTED");
      toast.success("TOR diajukan untuk persetujuan.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function approve() {
    setBusy("approve");
    try {
      await update({ status: "APPROVED" });
      setStatus("APPROVED");
      toast.success("TOR disetujui.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    setBusy("reject");
    try {
      await update({ status: "REJECTED" });
      setStatus("REJECTED");
      toast.info("TOR ditolak.");
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function destroy() {
    if (!confirm("Hapus TOR ini permanen?")) return;
    setBusy("delete");
    const res = await fetch(`/api/tor/${torId}`, { method: "DELETE" });
    if (!res.ok) {
      setBusy(null);
      toast.error("Gagal menghapus.");
      return;
    }
    toast.success("TOR dihapus.");
    router.push(`/labs/${labSlug}/tor`);
  }

  const editable = canEdit && (status === "DRAFT" || status === "REJECTED");

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[240px] space-y-1.5">
            <Label htmlFor="tor-title">Judul</Label>
            <Input
              id="tor-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!editable}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <div>
              <Badge variant={VARIANTS[status]}>{status}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <TiptapEditor value={content} onChange={setContent} editable={editable} />

      <div className="flex flex-wrap items-center gap-2 justify-end">
        {canEdit && (
          <Button variant="destructive" size="sm" onClick={destroy} disabled={busy !== null}>
            <FontAwesomeIcon icon={busy === "delete" ? faSpinner : faTrash} className={busy === "delete" ? "animate-spin" : ""} />
            Hapus
          </Button>
        )}
        {canEdit && editable && (
          <>
            <Button variant="outline" onClick={save} disabled={busy !== null}>
              <FontAwesomeIcon icon={busy === "save" ? faSpinner : faFloppyDisk} className={busy === "save" ? "animate-spin" : ""} />
              Simpan draft
            </Button>
            <Button onClick={submit} disabled={busy !== null}>
              <FontAwesomeIcon icon={busy === "submit" ? faSpinner : faPaperPlane} className={busy === "submit" ? "animate-spin" : ""} />
              Ajukan ke superadmin
            </Button>
          </>
        )}
        {canApprove && status === "SUBMITTED" && (
          <>
            <Button variant="outline" onClick={reject} disabled={busy !== null}>
              <FontAwesomeIcon icon={busy === "reject" ? faSpinner : faCircleXmark} className={busy === "reject" ? "animate-spin" : ""} />
              Tolak
            </Button>
            <Button onClick={approve} disabled={busy !== null}>
              <FontAwesomeIcon icon={busy === "approve" ? faSpinner : faCircleCheck} className={busy === "approve" ? "animate-spin" : ""} />
              Setujui
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
