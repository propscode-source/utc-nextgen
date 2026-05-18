"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { emitPointsChanged } from "@/lib/points-events";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCircleXmark,
  faPaperPlane,
  faSpinner,
  faPlay,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";

type QuestionType = "MCQ" | "TRUE_FALSE" | "ESSAY";
type Question = {
  id: string;
  type: QuestionType;
  text: string;
  choices: { id: string; text: string }[];
};

type AnswerMap = Record<string, { choiceId?: string; essayText?: string }>;

export function QuizRunner({
  quizId,
  courseSlug,
  minScore,
  questions,
}: {
  quizId: string;
  courseSlug: string;
  minScore: number;
  questions: Question[];
}) {
  const router = useRouter();
  const { update } = useSession();
  const [started, setStarted] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | { score: number; passed: boolean; correct: number; total: number }>(null);

  async function start() {
    const res = await fetch(`/api/quizzes/${quizId}/attempts`, { method: "POST" });
    if (!res.ok) {
      toast.error("Gagal memulai quiz.");
      return;
    }
    const body = (await res.json()) as { attemptId: string };
    setAttemptId(body.attemptId);
    setStarted(true);
  }

  function setChoice(qId: string, choiceId: string) {
    setAnswers((a) => ({ ...a, [qId]: { ...a[qId], choiceId } }));
  }
  function setEssay(qId: string, essayText: string) {
    setAnswers((a) => ({ ...a, [qId]: { ...a[qId], essayText } }));
  }

  async function submit() {
    if (!attemptId) return;
    const unanswered = questions.filter((q) => {
      const a = answers[q.id];
      if (!a) return true;
      if (q.type === "ESSAY") return !a.essayText?.trim();
      return !a.choiceId;
    });
    if (unanswered.length > 0) {
      const ok = window.confirm(
        `${unanswered.length} soal belum dijawab. Tetap submit? Soal yang kosong dianggap salah.`
      );
      if (!ok) return;
    }

    setSubmitting(true);
    const payload = {
      answers: questions.map((q) => ({
        questionId: q.id,
        choiceId: answers[q.id]?.choiceId,
        essayText: answers[q.id]?.essayText,
      })),
    };
    const res = await fetch(`/api/attempts/${attemptId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal submit quiz.");
      return;
    }
    const body = (await res.json()) as {
      score: number;
      passed: boolean;
      correct: number;
      total: number;
      newPoints?: number;
    };
    setResult(body);
    if (typeof body.newPoints === "number") {
      emitPointsChanged(body.newPoints);
      await update({ points: body.newPoints });
    }
    if (body.passed) toast.success(`Lulus! Skor ${body.score}%. +5 poin.`);
    else toast.error(`Belum lulus. Skor ${body.score}% (butuh ≥ ${minScore}%).`);
    router.refresh();
  }

  if (result) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <FontAwesomeIcon
            icon={result.passed ? faCircleCheck : faCircleXmark}
            className={cn("h-12 w-12 mx-auto", result.passed ? "text-emerald-500" : "text-destructive")}
          />
          <h2 className="text-lg font-bold">{result.passed ? "Selamat, kamu lulus!" : "Belum lulus"}</h2>
          <p className="text-sm text-muted-foreground">
            Skor: <strong>{result.score}%</strong> ({result.correct}/{result.total} benar)
          </p>
          <div className="flex justify-center gap-2 pt-2">
            {result.passed ? (
              <Button asChild>
                <Link href={`/courses/${courseSlug}/learn`}>Lanjut ke section berikutnya</Link>
              </Button>
            ) : (
              <>
                <Button variant="outline" asChild>
                  <Link href={`/courses/${courseSlug}/learn`}>Pelajari ulang</Link>
                </Button>
                <Button onClick={() => location.reload()}>Coba lagi</Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!started) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <FontAwesomeIcon icon={faPlay} className="h-10 w-10 text-primary mx-auto" />
          <h2 className="text-lg font-bold">Siap mulai quiz?</h2>
          <p className="text-sm text-muted-foreground">
            {questions.length} soal · Lulus ≥ {minScore}%. Setelah dimulai, kerjakan sampai submit.
          </p>
          <Button onClick={start}>Mulai quiz</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((q, idx) => {
        const a = answers[q.id];
        return (
          <Card key={q.id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Soal {idx + 1}</Badge>
                <Badge variant="secondary" className="text-[10px]">{q.type}</Badge>
              </div>
              <p className="text-sm">{q.text}</p>
              {q.type === "ESSAY" ? (
                <textarea
                  rows={4}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Tulis jawaban kamu di sini…"
                  value={a?.essayText ?? ""}
                  onChange={(e) => setEssay(q.id, e.target.value)}
                />
              ) : (
                <ul className="space-y-2">
                  {q.choices.map((c) => {
                    const selected = a?.choiceId === c.id;
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => setChoice(q.id, c.id)}
                          className={cn(
                            "w-full text-left rounded-md border px-3 py-2 text-sm transition",
                            selected
                              ? "border-primary bg-primary/10"
                              : "hover:bg-accent"
                          )}
                        >
                          <span className="inline-block h-4 w-4 rounded-full border mr-2 align-middle" style={{
                            background: selected ? "hsl(var(--primary))" : "transparent",
                            borderColor: selected ? "hsl(var(--primary))" : undefined,
                          }} />
                          {c.text}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}
      <div className="flex justify-end">
        <Button onClick={submit} disabled={submitting}>
          <FontAwesomeIcon icon={submitting ? faSpinner : faPaperPlane} className={submitting ? "animate-spin" : ""} />
          {submitting ? "Mengirim…" : "Submit jawaban"}
        </Button>
      </div>
    </div>
  );
}
