"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlay,
  faPaperPlane,
  faSpinner,
  faCircleCheck,
  faCircleXmark,
  faTriangleExclamation,
  faVideo,
  faStopwatch,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { emitPointsChanged } from "@/lib/points-events";

type QuestionType = "MCQ" | "TRUE_FALSE" | "ESSAY";
type Question = {
  id: string;
  type: QuestionType;
  text: string;
  choices: { id: string; text: string }[];
};
type ViolationType =
  | "TAB_SWITCH"
  | "FULLSCREEN_EXIT"
  | "COPY_PASTE"
  | "RIGHT_CLICK"
  | "MULTIPLE_FACES"
  | "NO_FACE"
  | "OTHER";

type AnswerMap = Record<string, { choiceId?: string; essayText?: string }>;

type SessionData = {
  sessionId: string;
  attemptId: string;
  endsAt: string | null;
  webcamEnabled: boolean;
  webcamIntervalSec: number;
  maxViolations: number;
};

function fmtRemaining(ms: number) {
  if (ms <= 0) return "00:00";
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ExamRunner({
  quizId,
  courseSlug,
  kind,
  minScore,
  timerSec,
  webcamEnabled,
  webcamIntervalSec,
  maxViolations,
  questions,
}: {
  quizId: string;
  courseSlug: string;
  kind: "pretest" | "final";
  minScore: number;
  timerSec: number | null;
  webcamEnabled: boolean;
  webcamIntervalSec: number;
  maxViolations: number;
  questions: Question[];
}) {
  const router = useRouter();
  const { update } = useSession();

  const [session, setSession] = useState<SessionData | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [violationCount, setViolationCount] = useState(0);
  const [forceEndReason, setForceEndReason] = useState<string | null>(null);
  const [result, setResult] = useState<null | {
    score: number;
    passed: boolean;
    correct: number;
    total: number;
    forced: boolean;
    needsManualGrading: boolean;
  }>(null);

  // Refs for handlers that need fresh state without re-binding listeners.
  const sessionRef = useRef<SessionData | null>(null);
  const answersRef = useRef<AnswerMap>({});
  const submittedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const endsAtMs = session?.endsAt ? new Date(session.endsAt).getTime() : null;
  const remainingMs = endsAtMs ? endsAtMs - now : null;

  /* ---------------- Submit (manual or forced) ---------------- */
  const submit = useCallback(
    async (forced = false) => {
      if (submittedRef.current || !sessionRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);

      const payload = {
        forced,
        answers: questions.map((q) => ({
          questionId: q.id,
          choiceId: answersRef.current[q.id]?.choiceId,
          essayText: answersRef.current[q.id]?.essayText,
        })),
      };
      const res = await fetch(`/api/exam-sessions/${sessionRef.current.sessionId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitting(false);
      if (!res.ok) {
        submittedRef.current = false;
        const b = (await res.json().catch(() => ({}))) as { error?: string };
        toast.error(b.error || "Gagal submit ujian.");
        return;
      }
      const body = (await res.json()) as {
        score: number;
        passed: boolean;
        correct: number;
        total: number;
        needsManualGrading: boolean;
        newPoints?: number;
        forced?: boolean;
      };
      setResult({
        score: body.score,
        passed: body.passed,
        correct: body.correct,
        total: body.total,
        forced: !!body.forced,
        needsManualGrading: body.needsManualGrading,
      });

      if (typeof body.newPoints === "number") {
        emitPointsChanged(body.newPoints);
        await update({ points: body.newPoints });
      }

      // Cleanup: exit fullscreen, stop webcam.
      try {
        if (document.fullscreenElement) await document.exitFullscreen();
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      router.refresh();
    },
    [questions, router, update]
  );

  /* ---------------- Violation reporting ---------------- */
  const reportViolation = useCallback(
    async (type: ViolationType, meta?: Record<string, unknown>) => {
      if (submittedRef.current || !sessionRef.current) return;
      try {
        const res = await fetch(
          `/api/exam-sessions/${sessionRef.current.sessionId}/violation`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, meta }),
          }
        );
        if (!res.ok) return;
        const body = (await res.json()) as {
          violationCount: number;
          maxViolations: number;
          forceEnded?: boolean;
        };
        setViolationCount(body.violationCount);
        if (body.forceEnded) {
          setForceEndReason("Pelanggaran melebihi batas.");
          toast.error("Sesi dipaksa berakhir karena pelanggaran. Mengirim jawaban…");
          await submit(true);
        } else {
          toast.warning(
            `Pelanggaran tercatat (${body.violationCount}/${body.maxViolations}): ${humanType(type)}`
          );
        }
      } catch {
        // Network failure — best-effort tracking, don't crash the exam.
      }
    },
    [submit]
  );

  /* ---------------- Start session ---------------- */
  async function start() {
    const res = await fetch(`/api/quizzes/${quizId}/exam-sessions`, { method: "POST" });
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal memulai sesi.");
      return;
    }
    const body = (await res.json()) as Partial<SessionData> & { alreadyPassed?: boolean };
    if (body.alreadyPassed) {
      toast.info("Kamu sudah lulus.");
      router.refresh();
      return;
    }
    if (!body.sessionId) {
      toast.error("Server tidak mengembalikan sessionId.");
      return;
    }
    setSession({
      sessionId: body.sessionId,
      attemptId: body.attemptId ?? "",
      endsAt: body.endsAt ?? null,
      webcamEnabled: body.webcamEnabled ?? false,
      webcamIntervalSec: body.webcamIntervalSec ?? 60,
      maxViolations: body.maxViolations ?? maxViolations,
    });

    // Try fullscreen.
    try {
      if (containerRef.current && containerRef.current.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      }
    } catch {
      // Safari iOS / browser may refuse — that's fine, FULLSCREEN_EXIT will catch later attempts.
    }

    // Try webcam if required.
    if (webcamEnabled) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => null);
        }
      } catch {
        toast.error("Gagal mengakses webcam. Sesi akan berlanjut tanpa webcam.");
      }
    }
  }

  /* ---------------- Anti-cheat listeners (only while ACTIVE) ---------------- */
  useEffect(() => {
    if (!session || result || forceEndReason) return;

    const tick = setInterval(() => setNow(Date.now()), 1000);

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        reportViolation("TAB_SWITCH");
      }
    };
    const onBlur = () => reportViolation("TAB_SWITCH", { source: "blur" });
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        reportViolation("FULLSCREEN_EXIT");
      }
    };
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation("COPY_PASTE", { kind: "copy" });
    };
    const onCut = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation("COPY_PASTE", { kind: "cut" });
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation("COPY_PASTE", { kind: "paste" });
    };
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      reportViolation("RIGHT_CLICK");
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "Yakin keluar? Jawaban akan disubmit otomatis.";
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [session, result, forceEndReason, reportViolation]);

  /* ---------------- Timer auto-submit ---------------- */
  useEffect(() => {
    if (!session || result) return;
    if (remainingMs === null) return;
    if (remainingMs > 0) return;
    // Time's up.
    setForceEndReason("Waktu habis.");
    submit(true);
  }, [remainingMs, session, result, submit]);

  /* ---------------- Heartbeat: react to proctor force-end / extend / warning ---------------- */
  const lastWarnAtRef = useRef<string | null>(null);
  useEffect(() => {
    if (!session || result) return;
    let stop = false;
    async function poll() {
      try {
        const res = await fetch(`/api/exam-sessions/${sessionRef.current!.sessionId}/heartbeat`, {
          cache: "no-store",
        });
        if (!res.ok || stop) return;
        const body = (await res.json()) as {
          status: string;
          endsAt: string | null;
          proctorMessage: string | null;
          proctorMessageAt: string | null;
        };
        // Force-end by proctor or violation.
        if (body.status === "FORCE_ENDED" && !submittedRef.current) {
          setForceEndReason("Sesi diakhiri oleh proktor.");
          await submit(true);
          return;
        }
        // Extended endsAt: update local session.
        if (body.endsAt && body.endsAt !== sessionRef.current!.endsAt) {
          setSession((prev) => (prev ? { ...prev, endsAt: body.endsAt! } : prev));
        }
        // New proctor warning.
        if (
          body.proctorMessage &&
          body.proctorMessageAt &&
          body.proctorMessageAt !== lastWarnAtRef.current
        ) {
          lastWarnAtRef.current = body.proctorMessageAt;
          toast.warning(`Peringatan proktor: ${body.proctorMessage}`, { duration: 8000 });
        }
      } catch {}
    }
    poll();
    const interval = setInterval(poll, 5000);
    return () => {
      stop = true;
      clearInterval(interval);
    };
  }, [session, result, submit]);

  /* ---------------- Webcam snapshot loop ---------------- */
  useEffect(() => {
    if (!session?.webcamEnabled || result || !streamRef.current) return;
    const interval = setInterval(async () => {
      if (!videoRef.current || submittedRef.current) return;
      try {
        const video = videoRef.current;
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(video.videoWidth || 320, 480);
        canvas.height = Math.min(video.videoHeight || 240, 360);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageUrl = canvas.toDataURL("image/jpeg", 0.6);
        await fetch(`/api/exam-sessions/${sessionRef.current!.sessionId}/snapshot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl }),
        });
      } catch {
        // ignore — best effort
      }
    }, (session.webcamIntervalSec ?? 60) * 1000);
    return () => clearInterval(interval);
  }, [session, result]);

  /* ---------------- Cleanup on unmount ---------------- */
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function setChoice(qId: string, choiceId: string) {
    setAnswers((a) => ({ ...a, [qId]: { ...a[qId], choiceId } }));
  }
  function setEssay(qId: string, essayText: string) {
    setAnswers((a) => ({ ...a, [qId]: { ...a[qId], essayText } }));
  }

  /* ---------------- Render ---------------- */

  if (result) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <FontAwesomeIcon
            icon={result.passed ? faCircleCheck : faCircleXmark}
            className={cn("h-12 w-12 mx-auto", result.passed ? "text-emerald-500" : "text-destructive")}
          />
          <h2 className="text-lg font-bold">
            {result.passed ? "Selamat, kamu lulus!" : "Belum lulus"}
            {result.forced && " (Sesi force-ended)"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Skor: <strong>{result.score}%</strong> ({result.correct}/{result.total} benar otomatis)
            {result.needsManualGrading && (
              <span className="block text-amber-600 mt-1">
                Ada soal essay yang menunggu penilaian proktor — skor final bisa berubah.
              </span>
            )}
          </p>
          <div className="flex justify-center gap-2 pt-2 flex-wrap">
            <Button asChild variant="outline">
              <Link href={`/courses/${courseSlug}/learn`}>Kembali ke pembelajaran</Link>
            </Button>
            {!result.passed && (
              <Button onClick={() => location.reload()}>Lihat sesi lagi</Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!session) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <FontAwesomeIcon icon={faPlay} className="h-10 w-10 text-primary mx-auto" />
          <h2 className="text-lg font-bold">Siap memulai {kind === "pretest" ? "pretest" : "final exam"}?</h2>
          <p className="text-sm text-muted-foreground">
            {questions.length} soal · Lulus ≥ {minScore}%. Setelah dimulai, kerjakan sampai selesai —
            keluar paksa akan tercatat sebagai pelanggaran.
          </p>
          <Button onClick={start}>
            <FontAwesomeIcon icon={faPlay} /> Mulai sekarang
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Active exam session
  return (
    <div ref={containerRef} className="space-y-4 bg-background rounded-lg select-none" data-exam-active>
      {/* Top bar with timer and violations */}
      <div className="sticky top-0 z-20 -mx-1 rounded-md border bg-card/95 backdrop-blur px-4 py-2 flex flex-wrap items-center gap-3 shadow-sm">
        {remainingMs !== null && (
          <div
            className={cn(
              "inline-flex items-center gap-2 font-mono tabular-nums text-sm font-bold",
              remainingMs < 60_000 ? "text-destructive animate-pulse" : "text-foreground"
            )}
          >
            <FontAwesomeIcon icon={faStopwatch} className="h-3.5 w-3.5" />
            {fmtRemaining(remainingMs)}
          </div>
        )}
        <Badge
          variant={violationCount === 0 ? "outline" : violationCount >= session.maxViolations - 1 ? "destructive" : "warning"}
          className="text-[10px]"
        >
          <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1 h-2.5 w-2.5" />
          {violationCount}/{session.maxViolations} pelanggaran
        </Badge>
        {session.webcamEnabled && streamRef.current && (
          <Badge variant="info" className="text-[10px]">
            <FontAwesomeIcon icon={faVideo} className="mr-1 h-2.5 w-2.5" /> Webcam aktif
          </Badge>
        )}
        <div className="flex-1" />
        <Button onClick={() => submit(false)} disabled={submitting} size="sm">
          <FontAwesomeIcon icon={submitting ? faSpinner : faPaperPlane} className={submitting ? "animate-spin" : ""} />
          {submitting ? "Mengirim…" : "Submit"}
        </Button>
      </div>

      {/* Hidden webcam preview (small thumbnail in corner). */}
      {session.webcamEnabled && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="fixed bottom-3 right-3 z-30 h-24 w-32 rounded-md border-2 border-primary shadow-lg bg-black object-cover"
        />
      )}

      <div className="space-y-3">
        {questions.map((q, idx) => {
          const a = answers[q.id];
          return (
            <Card key={q.id}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Soal {idx + 1}</Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {q.type}
                  </Badge>
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
                              selected ? "border-primary bg-primary/10" : "hover:bg-accent"
                            )}
                          >
                            <span
                              className="inline-block h-4 w-4 rounded-full border mr-2 align-middle"
                              style={{
                                background: selected ? "hsl(var(--primary))" : "transparent",
                                borderColor: selected ? "hsl(var(--primary))" : undefined,
                              }}
                            />
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
      </div>

      <div className="flex items-center justify-end pb-8">
        <Button onClick={() => submit(false)} disabled={submitting}>
          <FontAwesomeIcon icon={submitting ? faSpinner : faPaperPlane} className={submitting ? "animate-spin" : ""} />
          {submitting ? "Mengirim…" : "Submit jawaban"}
        </Button>
      </div>
    </div>
  );
}

function humanType(t: ViolationType): string {
  switch (t) {
    case "TAB_SWITCH":
      return "Pindah tab/aplikasi";
    case "FULLSCREEN_EXIT":
      return "Keluar fullscreen";
    case "COPY_PASTE":
      return "Copy/paste/cut";
    case "RIGHT_CLICK":
      return "Klik kanan";
    case "MULTIPLE_FACES":
      return "Banyak wajah di webcam";
    case "NO_FACE":
      return "Wajah tidak terdeteksi";
    default:
      return "Pelanggaran lain";
  }
}
