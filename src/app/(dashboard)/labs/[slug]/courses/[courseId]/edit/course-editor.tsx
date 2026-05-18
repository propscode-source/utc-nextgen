"use client";

import React, { useState } from "react";
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
import { TiptapEditor } from "@/components/tiptap-editor";
import { plainTextToTiptapDoc, isTiptapDoc } from "@/lib/tiptap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFloppyDisk,
  faSpinner,
  faPlus,
  faTrash,
  faChevronDown,
  faChevronRight,
  faClipboardQuestion,
  faPenToSquare,
  faExternalLink,
} from "@fortawesome/free-solid-svg-icons";

type LessonType = "VIDEO" | "PDF" | "TEXT";
type Lesson = {
  id: string;
  title: string;
  order: number;
  type: LessonType;
  contentText: string;
  contentJson: object | null;
  contentUrl: string;
  durationSec: number | null;
};
type Section = {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
  quiz: { id: string; minScore: number; maxAttempts: number; questionCount: number } | null;
};
type Course = {
  id: string;
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  isLocked: boolean;
  pointPrice: number;
  passScore: number;
  requirePretest: boolean;
  certNumberPrefix: string;
  certNumberPattern: string;
};
type ExamQuiz = { id: string; questionCount: number } | null;

export function CourseEditor({
  labSlug,
  course: initialCourse,
  sections: initialSections,
  pretestQuiz,
  finalQuiz,
}: {
  labSlug: string;
  course: Course;
  sections: Section[];
  pretestQuiz: ExamQuiz;
  finalQuiz: ExamQuiz;
}) {
  const router = useRouter();
  const [course, setCourse] = useState(initialCourse);
  const [sections, setSections] = useState(initialSections);
  const [savingCourse, setSavingCourse] = useState(false);
  const [openSectionIds, setOpenSectionIds] = useState<Set<string>>(new Set(initialSections.map((s) => s.id)));
  const [busyExam, setBusyExam] = useState<null | "PRETEST" | "FINAL">(null);

  async function ensureExam(kind: "PRETEST" | "FINAL") {
    setBusyExam(kind);
    const res = await fetch(`/api/courses/${course.id}/exam`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    setBusyExam(null);
    if (!res.ok) {
      toast.error("Gagal membuat quiz ujian.");
      return;
    }
    const body = (await res.json()) as { id: string };
    router.push(`/labs/${labSlug}/courses/${course.id}/edit/quiz/${body.id}`);
  }

  function toggleSection(id: string) {
    setOpenSectionIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function saveCourse() {
    setSavingCourse(true);
    const res = await fetch(`/api/courses/${course.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(course),
    });
    setSavingCourse(false);
    if (!res.ok) {
      const b = (await res.json().catch(() => ({}))) as { error?: string };
      toast.error(b.error || "Gagal menyimpan course.");
      return;
    }
    toast.success("Course tersimpan.");
    router.refresh();
  }

  async function deleteCourse() {
    if (!confirm(`Hapus course "${course.title}" beserta semua section, lesson, dan quiz?`)) return;
    const res = await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Gagal menghapus course.");
      return;
    }
    toast.success("Course dihapus.");
    router.push(`/labs/${labSlug}/courses`);
  }

  async function addSection() {
    const title = window.prompt("Judul section?");
    if (!title) return;
    const res = await fetch(`/api/courses/${course.id}/sections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      toast.error("Gagal menambah section.");
      return;
    }
    const created = (await res.json()) as Section;
    setSections([...sections, { ...created, lessons: [], quiz: null }]);
    setOpenSectionIds((s) => new Set([...s, created.id]));
    toast.success("Section ditambahkan.");
    router.refresh();
  }

  async function updateSection(s: Section, patch: { title?: string }) {
    const res = await fetch(`/api/sections/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Gagal menyimpan section.");
      return;
    }
    setSections((arr) => arr.map((x) => (x.id === s.id ? { ...x, ...patch } : x)));
    router.refresh();
  }

  async function deleteSection(s: Section) {
    if (!confirm(`Hapus section "${s.title}"?`)) return;
    const res = await fetch(`/api/sections/${s.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Gagal menghapus section.");
      return;
    }
    setSections((arr) => arr.filter((x) => x.id !== s.id));
    toast.success("Section dihapus.");
    router.refresh();
  }

  async function addLesson(s: Section) {
    const res = await fetch(`/api/sections/${s.id}/lessons`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Lesson baru", type: "TEXT" }),
    });
    if (!res.ok) {
      toast.error("Gagal menambah lesson.");
      return;
    }
    const created = (await res.json()) as Lesson;
    setSections((arr) =>
      arr.map((x) => (x.id === s.id ? { ...x, lessons: [...x.lessons, created] } : x))
    );
    router.refresh();
  }

  async function updateLesson(s: Section, l: Lesson, patch: Partial<Lesson>) {
    const res = await fetch(`/api/lessons/${l.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error("Gagal menyimpan lesson.");
      return;
    }
    setSections((arr) =>
      arr.map((x) =>
        x.id === s.id
          ? { ...x, lessons: x.lessons.map((ll) => (ll.id === l.id ? { ...ll, ...patch } : ll)) }
          : x
      )
    );
    router.refresh();
  }

  async function deleteLesson(s: Section, l: Lesson) {
    if (!confirm(`Hapus lesson "${l.title}"?`)) return;
    const res = await fetch(`/api/lessons/${l.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Gagal menghapus lesson.");
      return;
    }
    setSections((arr) =>
      arr.map((x) => (x.id === s.id ? { ...x, lessons: x.lessons.filter((ll) => ll.id !== l.id) } : x))
    );
    toast.success("Lesson dihapus.");
    router.refresh();
  }

  async function ensureSectionQuiz(s: Section) {
    if (s.quiz) {
      router.push(`/labs/${labSlug}/courses/${course.id}/edit/quiz/${s.quiz.id}`);
      return;
    }
    const res = await fetch(`/api/sections/${s.id}/quiz`, { method: "POST" });
    if (!res.ok) {
      toast.error("Gagal membuat quiz.");
      return;
    }
    const created = (await res.json()) as { id: string };
    router.push(`/labs/${labSlug}/courses/${course.id}/edit/quiz/${created.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Link href={`/labs/${labSlug}/courses`} className="text-xs text-muted-foreground hover:underline">
          ← Kembali ke daftar course
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/labs/${labSlug}/courses/${course.id}/edit/certificates`}>
              Sertifikat
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/courses/${course.slug}`}>
              <FontAwesomeIcon icon={faExternalLink} /> Pratinjau publik
            </Link>
          </Button>
        </div>
      </div>

      {/* Course meta */}
      <Card>
        <CardHeader>
          <CardTitle>Detail course</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="title">Judul</Label>
            <Input id="title" value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="desc">Deskripsi</Label>
            <Textarea id="desc" rows={4} value={course.description} onChange={(e) => setCourse({ ...course, description: e.target.value })} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="thumb">Thumbnail URL (opsional)</Label>
            <Input id="thumb" placeholder="https://…" value={course.thumbnailUrl} onChange={(e) => setCourse({ ...course, thumbnailUrl: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pass">Skor lulus final exam (%)</Label>
            <Input
              id="pass"
              type="number"
              min={0}
              max={100}
              value={course.passScore}
              onChange={(e) => setCourse({ ...course, passScore: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="price">Harga buka (poin)</Label>
            <Input
              id="price"
              type="number"
              min={0}
              value={course.pointPrice}
              onChange={(e) => setCourse({ ...course, pointPrice: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={course.isLocked}
                onChange={(e) => setCourse({ ...course, isLocked: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              Course terkunci — wajib bayar poin untuk daftar
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={course.requirePretest}
                onChange={(e) => setCourse({ ...course, requirePretest: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              Wajib lulus pretest sebelum mulai belajar
            </label>
          </div>
          <div className="space-y-1.5 md:col-span-1">
            <Label htmlFor="cert-prefix">Cert prefix</Label>
            <Input
              id="cert-prefix"
              placeholder="UTC (default) atau FASILKOM-PEL"
              value={course.certNumberPrefix}
              onChange={(e) => setCourse({ ...course, certNumberPrefix: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground">
              Dipakai sebagai token <code>{"{PREFIX}"}</code> di pattern. Kosong = "UTC".
            </p>
          </div>
          <div className="space-y-1.5 md:col-span-1">
            <Label htmlFor="cert-pattern">Cert pattern</Label>
            <Input
              id="cert-pattern"
              placeholder="{PREFIX}/{YEAR}/{SEQ4}"
              value={course.certNumberPattern}
              onChange={(e) => setCourse({ ...course, certNumberPattern: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground">
              Token: <code>{"{PREFIX}"}</code> <code>{"{YEAR}"}</code> <code>{"{MONTH}"}</code>{" "}
              <code>{"{SEQ}"}</code> <code>{"{SEQ4}"}</code>. SEQ monotonik per course.
            </p>
          </div>
          <div className="md:col-span-2 flex items-center gap-2 justify-end">
            <Button variant="destructive" onClick={deleteCourse}>
              <FontAwesomeIcon icon={faTrash} /> Hapus course
            </Button>
            <Button onClick={saveCourse} disabled={savingCourse}>
              <FontAwesomeIcon icon={savingCourse ? faSpinner : faFloppyDisk} className={savingCourse ? "animate-spin" : ""} />
              Simpan course
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pretest & Final Exam */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ujian (Pretest & Final)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <ExamCardBlock
            label="Pretest"
            description="Wajib lulus dulu sebelum mahasiswa bisa mulai belajar (jika diaktifkan)."
            quiz={pretestQuiz}
            busy={busyExam === "PRETEST"}
            onCreate={() => ensureExam("PRETEST")}
            onEdit={(qid) => router.push(`/labs/${labSlug}/courses/${course.id}/edit/quiz/${qid}`)}
          />
          <ExamCardBlock
            label="Final Exam"
            description="Wajib lulus untuk dapat sertifikat. Anti-cheat strict (fullscreen + tab-switch + violation)."
            quiz={finalQuiz}
            busy={busyExam === "FINAL"}
            onCreate={() => ensureExam("FINAL")}
            onEdit={(qid) => router.push(`/labs/${labSlug}/courses/${course.id}/edit/quiz/${qid}`)}
          />
        </CardContent>
      </Card>

      {/* Sections */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Section & Lesson</h2>
        <Button size="sm" onClick={addSection}>
          <FontAwesomeIcon icon={faPlus} /> Section baru
        </Button>
      </div>

      <div className="space-y-3">
        {sections.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Belum ada section. Tambah dulu untuk mengisi materi.
            </CardContent>
          </Card>
        )}

        {sections.map((s, idx) => {
          const open = openSectionIds.has(s.id);
          return (
            <Card key={s.id}>
              <CardContent className="p-0">
                <div className="flex items-center gap-3 p-4 border-b">
                  <button
                    type="button"
                    onClick={() => toggleSection(s.id)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Toggle"
                  >
                    <FontAwesomeIcon icon={open ? faChevronDown : faChevronRight} className="h-3 w-3" />
                  </button>
                  <Badge variant="outline">Section {idx + 1}</Badge>
                  <Input
                    value={s.title}
                    onChange={(e) => setSections((arr) => arr.map((x) => (x.id === s.id ? { ...x, title: e.target.value } : x)))}
                    onBlur={(e) => updateSection(s, { title: e.target.value })}
                    className="flex-1 h-8"
                  />
                  <Button variant="ghost" size="sm" onClick={() => ensureSectionQuiz(s)}>
                    <FontAwesomeIcon icon={faClipboardQuestion} />
                    {s.quiz ? `Edit quiz (${s.quiz.questionCount} soal)` : "Buat quiz"}
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Hapus" onClick={() => deleteSection(s)}>
                    <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
                  </Button>
                </div>
                {open && (
                  <div className="p-4 space-y-3">
                    {s.lessons.length === 0 && (
                      <p className="text-xs text-muted-foreground">Belum ada lesson.</p>
                    )}
                    {s.lessons.map((l, li) => (
                      <LessonRow
                        key={l.id}
                        lesson={l}
                        index={li}
                        onChange={(patch) => updateLesson(s, l, patch)}
                        onDelete={() => deleteLesson(s, l)}
                      />
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addLesson(s)}>
                      <FontAwesomeIcon icon={faPlus} /> Lesson baru
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function LessonRow({
  lesson,
  index,
  onChange,
  onDelete,
}: {
  lesson: Lesson;
  index: number;
  onChange: (patch: Partial<Lesson>) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [contentUrl, setContentUrl] = useState(lesson.contentUrl);

  // Initial doc for Tiptap: prefer existing JSON, else convert legacy plain text
  const initialDoc = isTiptapDoc(lesson.contentJson)
    ? lesson.contentJson
    : plainTextToTiptapDoc(lesson.contentText);

  // Debounce save: queue last edit and persist 800ms after user stops typing
  const [pendingDoc, setPendingDoc] = useState<object | null>(null);
  React.useEffect(() => {
    if (!pendingDoc) return;
    const t = setTimeout(() => {
      onChange({ contentJson: pendingDoc });
      setPendingDoc(null);
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDoc]);

  return (
    <div className="rounded-md border p-3 space-y-2 bg-muted/30">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-[10px]">
          {index + 1}
        </Badge>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== lesson.title && onChange({ title })}
          className="flex-1 h-8"
        />
        <Select value={lesson.type} onValueChange={(v) => onChange({ type: v as LessonType })}>
          <SelectTrigger className="w-28 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="TEXT">Text</SelectItem>
            <SelectItem value="VIDEO">Video</SelectItem>
            <SelectItem value="PDF">PDF</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" aria-label="Hapus" onClick={onDelete}>
          <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
        </Button>
      </div>
      {lesson.type === "TEXT" ? (
        <div>
          <TiptapEditor
            value={initialDoc}
            onChange={(json) => setPendingDoc(json)}
            placeholder="Tulis materi pelajaran di sini — gunakan toolbar untuk format teks…"
            minHeight="min-h-[180px]"
          />
          <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
            Auto-simpan {pendingDoc ? "…" : ""}
          </p>
        </div>
      ) : (
        <Input
          placeholder={lesson.type === "VIDEO" ? "URL embed (YouTube/Vimeo)…" : "URL PDF…"}
          value={contentUrl}
          onChange={(e) => setContentUrl(e.target.value)}
          onBlur={() => contentUrl !== lesson.contentUrl && onChange({ contentUrl })}
        />
      )}
    </div>
  );
}

function ExamCardBlock({
  label,
  description,
  quiz,
  busy,
  onCreate,
  onEdit,
}: {
  label: string;
  description: string;
  quiz: { id: string; questionCount: number } | null;
  busy: boolean;
  onCreate: () => void;
  onEdit: (id: string) => void;
}) {
  return (
    <div className="rounded-md border p-3 space-y-2 bg-muted/30">
      <div className="text-sm font-medium">{label}</div>
      <p className="text-xs text-muted-foreground">{description}</p>
      {quiz ? (
        <div className="flex items-center justify-between gap-2 pt-1">
          <Badge variant="info" className="text-[10px]">
            {quiz.questionCount} soal
          </Badge>
          <Button size="sm" variant="outline" onClick={() => onEdit(quiz.id)}>
            <FontAwesomeIcon icon={faClipboardQuestion} /> Edit ujian
          </Button>
        </div>
      ) : (
        <Button size="sm" onClick={onCreate} disabled={busy}>
          <FontAwesomeIcon icon={busy ? faSpinner : faPlus} className={busy ? "animate-spin" : ""} />
          Buat {label.toLowerCase()}
        </Button>
      )}
    </div>
  );
}
