"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserPlus, faSpinner, faMagnifyingGlass } from "@fortawesome/free-solid-svg-icons";

type FoundUser = {
  id: string;
  name: string;
  email: string;
  nim: string | null;
  prodi: string | null;
  role: string;
  image: string | null;
};

export function MembersToolbar({ labId }: { labId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoundUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);

  // Debounced search.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!open) return;
    if (query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/search?q=${encodeURIComponent(query.trim())}&excludeLabId=${encodeURIComponent(labId)}`
        );
        if (!res.ok) {
          setResults([]);
          return;
        }
        const body = (await res.json()) as { users: FoundUser[] };
        setResults(body.users);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, open, labId]);

  async function add(user: FoundUser) {
    setAdding(user.id);
    const res = await fetch(`/api/labs/${labId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // The members POST API still accepts an identifier (email/NIM); pass email for clarity.
      body: JSON.stringify({ identifier: user.email }),
    });
    setAdding(null);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menambah anggota.");
      return;
    }
    toast.success(`${user.name} ditambahkan ke lab.`);
    setResults((arr) => arr.filter((u) => u.id !== user.id));
    router.refresh();
  }

  return (
    <div className="flex justify-end">
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setQuery("");
            setResults([]);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button>
            <FontAwesomeIcon icon={faUserPlus} /> Tambah anggota
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah anggota lab</DialogTitle>
            <DialogDescription>
              Cari nama, email, atau NIM. Klik baris untuk menambahkan ke lab.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="m-search">Cari user</Label>
              <div className="relative">
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="m-search"
                  className="pl-9"
                  placeholder="Mahasiswa 2 / mhs2@... / 09011382326002"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                  autoComplete="off"
                />
              </div>
            </div>
            <div className="rounded-md border max-h-72 overflow-y-auto scrollbar-hide">
              {loading && (
                <ul className="divide-y">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <li key={i} className="flex items-center gap-3 px-3 py-2">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-2.5 w-2/3" />
                      </div>
                      <Skeleton className="h-3 w-3" />
                    </li>
                  ))}
                </ul>
              )}
              {!loading && query.trim().length < 2 && (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  Ketik minimal 2 karakter untuk mencari.
                </div>
              )}
              {!loading && query.trim().length >= 2 && results.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  Tidak ada user yang cocok atau semuanya sudah jadi anggota.
                </div>
              )}
              <ul className="divide-y">
                {results.map((u) => {
                  const initials = u.name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        onClick={() => add(u)}
                        disabled={adding === u.id}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent disabled:opacity-50"
                      >
                        <Avatar className="h-8 w-8">
                          {u.image && <AvatarImage src={u.image} alt={u.name} />}
                          <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{u.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {u.nim ? `${u.nim} · ` : ""}
                            {u.email}
                            {u.prodi ? ` · ${u.prodi}` : ""}
                          </div>
                        </div>
                        <FontAwesomeIcon
                          icon={adding === u.id ? faSpinner : faUserPlus}
                          className={
                            adding === u.id
                              ? "h-3 w-3 animate-spin text-muted-foreground"
                              : "h-3 w-3 text-muted-foreground"
                          }
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
