"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faTrash,
  faFloppyDisk,
  faSpinner,
  faRotateLeft,
  faCircleCheck,
} from "@fortawesome/free-solid-svg-icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type QuestionType = "MCQ" | "TRUE_FALSE" | "ESSAY";

type Choice = { id: string; text: string; isCorrect: boolean; order: number };
type Question = {
  id: string;
  type: QuestionType;
  order: number;
  text: string;
  points: number;
  choices: Choice[];
};
type QuizMeta = {
  id: string;
  minScore: number;
  maxAttempts: number;
  timerSec: number | null;
  cooldownMinutes: number | null;
  randomize: boolean;
  webcamEnabled: boolean;
  webcamIntervalSec: number;
  maxViolations: number;
};

type QuizKind = "SECTION" | "PRETEST" | "FINAL";

type UserAttempt = {
  userId: string;
  name: string;
  email: string;
  nim: string | null;
  total: number;
  submittedInWindow: number;
  passed: boolean;
  lastAt: string | null;
};

export function QuizQuestionEditor({
  labSlug,
  courseId,
  sectionTitle,
  quizKind,
  quiz: initialQuiz,
  questions: initialQuestions,
  userAttempts,
}: {
  labSlug: string;
  courseId: string;
  sectionTitle: string;
  quizKind: QuizKind;
  quiz: QuizMeta;
  questions: Question[];
  userAttempts: UserAttempt[];
}) {
  const isExam = quizKind === "PRETEST" || quizKind === "FINAL";
  const router = useRouter();
  const [quiz, setQuiz] = useState(initialQuiz);
  const [questions, setQuestions] = useState(initialQuestions);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [resetting, setResetting] = useState<string | null>(null);
  const [identifier, setIdentifier] = useState("");

  async function resetForUser(userId: string, label: string) {
    if (!confirm(`Reset semua percobaan untuk ${label}? Riwayat akan dihapus permanen.`)) return;
    setResetting(userId);
    const res = await fetch(`/api/quizzes/${quiz.id}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setResetting(null);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal reset.");
      return;
    }
    const body = (await res.json()) as { deletedAttempts: number };
    toast.success(`Reset selesai. ${body.deletedAttempts} percobaan dihapus.`);
    router.refresh();
  }

  async function resetByIdentifier() {
    if (!identifier.trim()) {
      toast.error("Masukkan email atau NIM.");
      return;
    }
    setResetting("by-identifier");
    const res = await fetch(`/api/quizzes/${quiz.id}/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim() }),
    });
    setResetting(null);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal reset.");
      return;
    }
    const body = (await res.json()) as { deletedAttempts: number };
    toast.success(`Reset selesai. ${body.deletedAttempts} percobaan dihapus.`);
    setIdentifier("");
    router.refresh();
  }

  async function saveQuiz() {
    setSavingQuiz(true);
    const res = await fetch(`/api/quizzes/${quiz.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(quiz),
    });
    setSavingQuiz(false);
    if (!res.ok) {
      toast.error("Gagal menyimpan konfigurasi quiz.");
      return;
    }
    toast.success("Konfigurasi quiz disimpan.");
    router.refresh();
  }

  async function addQuestion(type: QuestionType) {
    const res = await fetch(`/api/quizzes/${quiz.id}/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, text: "Pertanyaan baru" }),
    });
    if (!res.ok) {
      toast.error("Gagal menambah soal.");
      return;
    }
    const created = (await res.json()) as Question;
    setQuestions([...questions, created]);
    router.refresh();
  }

  async function updateQuestion(q: Question, patch: Partial<Question>) {
    const res = await fetch(`/api/questions/${q.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Gagal menyimpan soal.");
      return;
    }
    setQuestions((arr) => arr.map((x) => (x.id === q.id ? { ...x, ...patch } : x)));
    router.refresh();
  }

  async function deleteQuestion(q: Question) {
    if (!confirm("Hapus soal ini?")) return;
    const res = await fetch(`/api/questions/${q.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Gagal menghapus soal.");
      return;
    }
    setQuestions((arr) => arr.filter((x) => x.id !== q.id));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/labs/${labSlug}/courses/${courseId}/edit`}
          className="text-xs text-muted-foreground hover:underline"
        >
          ← Kembali ke editor course
        </Link>
        <h1 className="text-xl font-bold tracking-tight mt-1">Quiz Section: {sectionTitle}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Konfigurasi quiz</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="min">Skor lulus (%)</Label>
            <Input
              id="min"
              type="number"
              min={0}
              max={100}
              value={quiz.minScore}
              onChange={(e) => setQuiz({ ...quiz, minScore: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max">Max percobaan</Label>
            <Input
              id="max"
              type="number"
              min={1}
              value={quiz.maxAttempts}
              onChange={(e) => setQuiz({ ...quiz, maxAttempts: Number(e.target.value) || 1 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cooldown">Cooldown (menit)</Label>
            <Input
              id="cooldown"
              type="number"
              min={0}
              placeholder="kosong = tanpa cooldown"
              value={quiz.cooldownMinutes ?? ""}
              onChange={(e) =>
                setQuiz({
                  ...quiz,
                  cooldownMinutes: e.target.value === "" ? null : Number(e.target.value) || 0,
                })
              }
            />
            <p className="text-[10px] text-muted-foreground">
              Setelah cooldown, percobaan reset otomatis (rolling window).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="timer">Timer (detik, kosong = tanpa)</Label>
            <Input
              id="timer"
              type="number"
              min={0}
              value={quiz.timerSec ?? ""}
              onChange={(e) =>
                setQuiz({ ...quiz, timerSec: e.target.value === "" ? null : Number(e.target.value) || null })
              }
            />
          </div>
          <div className="md:col-span-4 flex items-center justify-between">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={quiz.randomize}
                onChange={(e) => setQuiz({ ...quiz, randomize: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              Acak urutan soal & pilihan
            </label>
            <Button onClick={saveQuiz} disabled={savingQuiz}>
              <FontAwesomeIcon icon={savingQuiz ? faSpinner : faFloppyDisk} className={savingQuiz ? "animate-spin" : ""} />
              Simpan konfigurasi
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Anti-cheat — only for PRETEST/FINAL */}
      {isExam && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anti-cheat</CardTitle>
            <p className="text-xs text-muted-foreground">
              Berlaku saat mahasiswa mengerjakan ujian. Fullscreen lock, tab-switch detection, dan
              copy-paste block aktif otomatis.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="maxv">Max pelanggaran</Label>
              <Input
                id="maxv"
                type="number"
                min={1}
                max={20}
                value={quiz.maxViolations}
                onChange={(e) => setQuiz({ ...quiz, maxViolations: Number(e.target.value) || 1 })}
              />
              <p className="text-[10px] text-muted-foreground">Sesi force-end & auto-submit saat tercapai.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="webcamint">Interval webcam (detik)</Label>
              <Input
                id="webcamint"
                type="number"
                min={15}
                max={600}
                value={quiz.webcamIntervalSec}
                onChange={(e) => setQuiz({ ...quiz, webcamIntervalSec: Number(e.target.value) || 60 })}
                disabled={!quiz.webcamEnabled}
              />
              <p className="text-[10px] text-muted-foreground">Snapshot diambil tiap N detik bila webcam aktif.</p>
            </div>
            <div className="space-y-1.5 flex flex-col justify-end">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={quiz.webcamEnabled}
                  onChange={(e) => setQuiz({ ...quiz, webcamEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-input"
                />
                Aktifkan webcam snapshot
              </label>
              <p className="text-[10px] text-muted-foreground">
                Mahasiswa akan diminta izin kamera saat memulai ujian.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Reset percobaan mahasiswa</CardTitle>
          <Badge variant="outline" className="text-[10px]">{userAttempts.length} mahasiswa pernah mencoba</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Email atau NIM mahasiswa…"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  resetByIdentifier();
                }
              }}
            />
            <Button onClick={resetByIdentifier} disabled={resetting === "by-identifier"}>
              <FontAwesomeIcon
                icon={resetting === "by-identifier" ? faSpinner : faRotateLeft}
                className={resetting === "by-identifier" ? "animate-spin" : ""}
              />
              Reset by ID
            </Button>
          </div>

          {userAttempts.length > 0 && (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mahasiswa</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Dalam window</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userAttempts.map((u) => {
                    const blocked = !u.passed && u.submittedInWindow >= quiz.maxAttempts;
                    return (
                      <TableRow key={u.userId}>
                        <TableCell>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {u.nim ? `${u.nim} · ` : ""}
                            {u.email}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{u.total}</TableCell>
                        <TableCell className="text-right">
                          {u.submittedInWindow}/{quiz.maxAttempts}
                        </TableCell>
                        <TableCell>
                          {u.passed ? (
                            <Badge variant="success">
                              <FontAwesomeIcon icon={faCircleCheck} className="mr-1 h-2.5 w-2.5" />
                              Lulus
                            </Badge>
                          ) : blocked ? (
                            <Badge variant="destructive">Terblokir</Badge>
                          ) : (
                            <Badge variant="info">Aktif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetForUser(u.userId, u.name)}
                            disabled={resetting === u.userId}
                          >
                            <FontAwesomeIcon
                              icon={resetting === u.userId ? faSpinner : faRotateLeft}
                              className={resetting === u.userId ? "animate-spin" : ""}
                            />
                            Reset
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Soal ({questions.length})</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => addQuestion("MCQ")}>
            <FontAwesomeIcon icon={faPlus} /> MCQ
          </Button>
          <Button size="sm" variant="outline" onClick={() => addQuestion("TRUE_FALSE")}>
            <FontAwesomeIcon icon={faPlus} /> True/False
          </Button>
          <Button size="sm" variant="outline" onClick={() => addQuestion("ESSAY")}>
            <FontAwesomeIcon icon={faPlus} /> Essay
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {questions.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Belum ada soal.
            </CardContent>
          </Card>
        )}
        {questions.map((q, idx) => (
          <QuestionEditor
            key={q.id}
            question={q}
            index={idx}
            onUpdate={(patch) => updateQuestion(q, patch)}
            onDelete={() => deleteQuestion(q)}
          />
        ))}
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  index,
  onUpdate,
  onDelete,
}: {
  question: Question;
  index: number;
  onUpdate: (patch: Partial<Question>) => void;
  onDelete: () => void;
}) {
  const [text, setText] = useState(question.text);
  const [points, setPoints] = useState(question.points);

  async function setChoice(choiceId: string, patch: { text?: string; isCorrect?: boolean }) {
    const res = await fetch(`/api/questions/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        choices: question.choices.map((c) => (c.id === choiceId ? { ...c, ...patch } : c)),
      }),
    });
    if (!res.ok) {
      toast.error("Gagal menyimpan pilihan.");
      return;
    }
    const updated = (await res.json()) as { choices: Choice[] };
    onUpdate({ choices: updated.choices });
  }

  async function addChoice() {
    const newChoices = [
      ...question.choices,
      { id: `temp-${Date.now()}`, text: "Pilihan baru", isCorrect: false, order: question.choices.length },
    ];
    const res = await fetch(`/api/questions/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choices: newChoices }),
    });
    if (!res.ok) {
      toast.error("Gagal menambah pilihan.");
      return;
    }
    const updated = (await res.json()) as { choices: Choice[] };
    onUpdate({ choices: updated.choices });
  }

  async function removeChoice(choiceId: string) {
    const next = question.choices.filter((c) => c.id !== choiceId);
    const res = await fetch(`/api/questions/${question.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choices: next }),
    });
    if (!res.ok) {
      toast.error("Gagal menghapus pilihan.");
      return;
    }
    const updated = (await res.json()) as { choices: Choice[] };
    onUpdate({ choices: updated.choices });
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Soal {index + 1}</Badge>
          <Badge variant="secondary" className="text-[10px]">{question.type}</Badge>
          <div className="flex-1" />
          <Label htmlFor={`pt-${question.id}`} className="text-xs">Bobot</Label>
          <Input
            id={`pt-${question.id}`}
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value) || 1)}
            onBlur={() => points !== question.points && onUpdate({ points })}
            className="h-8 w-20"
          />
          <Button variant="ghost" size="icon" aria-label="Hapus" onClick={onDelete}>
            <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
          </Button>
        </div>
        <Textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={() => text !== question.text && onUpdate({ text })}
        />
        {question.type === "MCQ" && (
          <div className="space-y-2">
            {question.choices.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={c.isCorrect}
                  onChange={() => setChoice(c.id, { isCorrect: true })}
                  className="h-4 w-4"
                  title="Tandai sebagai jawaban benar"
                />
                <Input
                  value={c.text}
                  onChange={(e) =>
                    onUpdate({ choices: question.choices.map((x) => (x.id === c.id ? { ...x, text: e.target.value } : x)) })
                  }
                  onBlur={(e) => setChoice(c.id, { text: e.target.value })}
                  className="h-8 flex-1"
                />
                <Button variant="ghost" size="icon" aria-label="Hapus" onClick={() => removeChoice(c.id)}>
                  <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addChoice}>
              <FontAwesomeIcon icon={faPlus} /> Tambah pilihan
            </Button>
          </div>
        )}
        {question.type === "TRUE_FALSE" && (
          <div className="space-y-2">
            {question.choices.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`correct-${question.id}`}
                  checked={c.isCorrect}
                  onChange={() => setChoice(c.id, { isCorrect: true })}
                  className="h-4 w-4"
                />
                {c.text}
              </label>
            ))}
            {question.choices.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Pilihan akan otomatis dibuat ("Benar" / "Salah") setelah disimpan pertama kali.
              </p>
            )}
          </div>
        )}
        {question.type === "ESSAY" && (
          <p className="text-xs text-muted-foreground">
            Soal essay dinilai manual oleh proktor. Skor tidak dihitung otomatis di submit.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
