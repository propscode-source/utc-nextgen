"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faEllipsisVertical,
  faUserShield,
  faUserMinus,
  faUserSlash,
  faChalkboardUser,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

export function MemberRowActions({
  labId,
  memberId,
  userId,
  userName,
  isAdmin,
  isAssistant,
}: {
  labId: string;
  memberId: string;
  userId: string;
  userName: string;
  isAdmin: boolean;
  isAssistant: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setLabAdmin(makeAdmin: boolean) {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/labs/${labId}/admin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: makeAdmin ? userId : null }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal mengubah admin lab.");
      return;
    }
    toast.success(makeAdmin ? `${userName} jadi admin lab.` : `Admin lab di-unset.`);
    router.refresh();
  }

  async function setMemberRole(role: "ASSISTANT" | "MEMBER") {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/labs/${labId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal mengubah role.");
      return;
    }
    toast.success(
      role === "ASSISTANT"
        ? `${userName} sekarang jadi asisten lab.`
        : `${userName} kembali jadi anggota biasa.`
    );
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Hapus ${userName} dari lab?`)) return;
    setBusy(true);
    const res = await fetch(`/api/labs/${labId}/members?memberId=${memberId}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menghapus.");
      return;
    }
    toast.success("Anggota dihapus.");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={busy} aria-label="Aksi">
          <FontAwesomeIcon icon={faEllipsisVertical} className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isAdmin ? (
          <DropdownMenuItem onSelect={() => setLabAdmin(false)}>
            <FontAwesomeIcon icon={faUserSlash} /> Lepas sebagai admin lab
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => setLabAdmin(true)}>
            <FontAwesomeIcon icon={faUserShield} /> Jadikan admin lab
          </DropdownMenuItem>
        )}
        {isAssistant ? (
          <DropdownMenuItem onSelect={() => setMemberRole("MEMBER")}>
            <FontAwesomeIcon icon={faUser} /> Turunkan ke anggota biasa
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => setMemberRole("ASSISTANT")}>
            <FontAwesomeIcon icon={faChalkboardUser} /> Promosikan jadi asisten lab
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={remove}>
          <FontAwesomeIcon icon={faUserMinus} /> Hapus dari lab
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
