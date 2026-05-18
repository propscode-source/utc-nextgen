"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faCirclePlay,
  faClipboardQuestion,
  faLock,
  faSpinner,
  faArrowRight,
  faVideo,
  faFilePdf,
  faAlignLeft,
} from "@fortawesome/free-solid-svg-icons";
import { cn } from "@/lib/utils";
import { TiptapEditor } from "@/components/tiptap-editor";
import { isTiptapDoc } from "@/lib/tiptap";
import { useSession } from "next-auth/react";
import { emitPointsChanged } from "@/lib/points-events";

type LessonType = "VIDEO" | "PDF" | "TEXT";

type SectionVM = {
  id: string;
  title: string;
  order: number;
  unlocked: boolean;
  sectionPassed: boolean;
  lessons: { id: string; title: string; type: LessonType; completed: boolean }[];
  quiz: { id: string; minScore: number; questionCount: number; passed: boolean } | null;
};

type LessonVM = {
  id: string;
  title: string;
  type: LessonType;
  contentText: string | null;
  contentJson: object | null;
  contentUrl: string | null;
  durationSec: number | null;
  completed: boolean;
};

const TYPE_ICON: Record<LessonType, typeof faVideo> = {
  VIDEO: faVideo,
  PDF: faFilePdf,
  TEXT: faAlignLeft,
};

export function LearnShell({
  courseSlug,
  courseTitle,
  sections,
  activeLesson,
  progressPct,
}: {
  courseSlug: string;
  courseTitle: string;
  sections: SectionVM[];
  activeLesson: LessonVM | null;
  progressPct: number;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const { update } = useSession();
  const [completing, setCompleting] = useState(false);

  const flatUnlockedLessons = sections.flatMap((s) => (s.unlocked ? s.lessons : []));
  const currentIdx = activeLesson ? flatUnlockedLessons.findIndex((l) => l.id === activeLesson.id) : -1;
  const nextLesson = currentIdx >= 0 ? flatUnlockedLessons[currentIdx + 1] : null;

  // After current lesson, if it's the last lesson of a section that has a quiz, the next CTA = quiz
  const currentSection = sections.find((s) => s.lessons.some((l) => l.id === activeLesson?.id));
  const lastLessonOfSection =
    currentSection && currentSection.lessons[currentSection.lessons.length - 1]?.id === activeLesson?.id;
  const sectionQuizPending = currentSection && currentSection.quiz && !currentSection.quiz.passed;

  async function markComplete() {
    if (!activeLesson || activeLesson.completed) return;
    setCompleting(true);
    const res = await fetch(`/api/lessons/${activeLesson.id}/complete`, { method: "POST" });
    setCompleting(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menandai selesai.");
      return;
    }
    const body = (await res.json().catch(() => ({}))) as { newPoints?: number; already?: boolean };
    if (typeof body.newPoints === "number") {
      emitPointsChanged(body.newPoints);
      await update({ points: body.newPoints });
    }
    toast.success(body.already ? "Lesson sudah selesai sebelumnya." : "Lesson selesai. +10 poin.");
    router.refresh();
  }

  function jumpToLesson(id: string) {
    const usp = new URLSearchParams(params.toString());
    usp.set("lesson", id);
    router.push(`?${usp.toString()}`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
      {/* Left: section/lesson nav */}
      <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">Course</div>
              <Link href={`/courses/${courseSlug}`} className="font-semibold hover:underline">
                {courseTitle}
              </Link>
            </div>
            <Progress value={progressPct} />
            <div className="text-xs text-muted-foreground">{progressPct}% selesai</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
            <ul className="divide-y">
              {sections.map((s, idx) => (
                <li key={s.id} className="p-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold shrink-0",
                        s.sectionPassed
                          ? "bg-emerald-500 text-white"
                          : s.unlocked
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {s.sectionPassed ? (
                        <FontAwesomeIcon icon={faCircleCheck} className="h-3 w-3" />
                      ) : (
                        idx + 1
                      )}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{s.title}</div>
                    </div>
                    {!s.unlocked && (
                      <FontAwesomeIcon icon={faLock} className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  {s.unlocked && (
                    <ul className="mt-2 ml-8 space-y-1">
                      {s.lessons.map((l) => {
                        const isActive = activeLesson?.id === l.id;
                        return (
                          <li key={l.id}>
                            <button
                              type="button"
                              onClick={() => jumpToLesson(l.id)}
                              className={cn(
                                "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs",
                                isActive
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "hover:bg-accent text-muted-foreground"
                              )}
                            >
                              <FontAwesomeIcon
                                icon={l.completed ? faCircleCheck : faCirclePlay}
                                className={cn(
                                  "h-3 w-3",
                                  l.completed ? "text-emerald-500" : ""
                                )}
                              />
                              <span className="flex-1 truncate">{l.title}</span>
                            </button>
                          </li>
                        );
                      })}
                      {s.quiz && (
                        <li>
                          <Link
                            href={`/courses/${courseSlug}/quiz/${s.id}`}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                              s.quiz.passed
                                ? "text-muted-foreground"
                                : "text-amber-600 dark:text-amber-400 hover:bg-accent"
                            )}
                          >
                            <FontAwesomeIcon
                              icon={s.quiz.passed ? faCircleCheck : faClipboardQuestion}
                              className={cn("h-3 w-3", s.quiz.passed ? "text-emerald-500" : "")}
                            />
                            <span className="flex-1">Quiz section</span>
                            <Badge variant="outline" className="text-[10px]">
                              ≥ {s.quiz.minScore}%
                            </Badge>
                          </Link>
                        </li>
                      )}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </aside>

      {/* Right: lesson content */}
      <div className="space-y-4 min-w-0">
        {!activeLesson ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Course ini belum punya lesson yang bisa diakses.
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">
                    <FontAwesomeIcon icon={TYPE_ICON[activeLesson.type]} className="mr-1 h-2.5 w-2.5" />
                    {activeLesson.type}
                  </Badge>
                  {activeLesson.completed && <Badge variant="success">Selesai</Badge>}
                </div>
                <h1 className="text-xl font-bold tracking-tight">{activeLesson.title}</h1>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <LessonContent lesson={activeLesson} />
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                variant={activeLesson.completed ? "outline" : "default"}
                onClick={markComplete}
                disabled={completing || activeLesson.completed}
              >
                <FontAwesomeIcon
                  icon={activeLesson.completed ? faCircleCheck : completing ? faSpinner : faCircleCheck}
                  className={completing ? "animate-spin" : ""}
                />
                {activeLesson.completed ? "Sudah selesai" : "Tandai selesai (+10 poin)"}
              </Button>

              {lastLessonOfSection && sectionQuizPending && currentSection?.quiz ? (
                <Button asChild>
                  <Link href={`/courses/${courseSlug}/quiz/${currentSection.id}`}>
                    Ke quiz section <FontAwesomeIcon icon={faArrowRight} />
                  </Link>
                </Button>
              ) : nextLesson ? (
                <Button onClick={() => jumpToLesson(nextLesson.id)}>
                  Lesson berikutnya <FontAwesomeIcon icon={faArrowRight} />
                </Button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function LessonContent({ lesson }: { lesson: LessonVM }) {
  if (lesson.type === "VIDEO") {
    if (!lesson.contentUrl) return <p className="text-sm text-muted-foreground">Belum ada video.</p>;
    return (
      <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
        <iframe
          src={lesson.contentUrl}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title={lesson.title}
        />
      </div>
    );
  }
  if (lesson.type === "PDF") {
    if (!lesson.contentUrl) return <p className="text-sm text-muted-foreground">Belum ada file PDF.</p>;
    return (
      <object data={lesson.contentUrl} type="application/pdf" className="h-[70vh] w-full rounded-md border">
        <a href={lesson.contentUrl} className="text-primary underline" target="_blank" rel="noopener noreferrer">
          Buka PDF di tab baru
        </a>
      </object>
    );
  }
  if (isTiptapDoc(lesson.contentJson)) {
    return (
      <TiptapEditor
        value={lesson.contentJson}
        editable={false}
        minHeight="min-h-0"
      />
    );
  }
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">
      {lesson.contentText || <p className="text-muted-foreground">Belum ada materi teks.</p>}
    </div>
  );
}
