"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/ui/search-input";
import { GradeForm } from "./grade-form";
import { formatDate } from "@/lib/utils";

export type EssaySub = {
  id: string;
  essayText: string | null;
  question: { id: string; text: string; points: number };
  attempt: {
    id: string;
    quizId: string;
    userId: string;
    submittedAt: string | Date | null;
    quiz: { title: string; kind: string };
    user: { id: string; name: string; email: string; nim: string | null };
  };
};

export function GradingList({ subs }: { subs: EssaySub[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return subs;
    return subs.filter((s) =>
      `${s.attempt.quiz.title} ${s.attempt.quiz.kind} ${s.attempt.user.name} ${s.attempt.user.email} ${s.attempt.user.nim ?? ""} ${s.question.text}`
        .toLowerCase()
        .includes(q)
    );
  }, [subs, query]);

  if (subs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Tidak ada essay yang menunggu penilaian.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Cari mahasiswa, ujian, atau isi soal..."
          containerClassName="w-full sm:w-64 md:w-80"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Tidak ada essay yang cocok dengan &quot;{query}&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">
                    {s.attempt.quiz.kind}
                  </Badge>
                  <span className="text-sm font-medium">{s.attempt.quiz.title}</span>
                  <span className="text-xs text-muted-foreground">
                    · {s.attempt.user.name} ({s.attempt.user.nim ?? s.attempt.user.email})
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {s.attempt.submittedAt ? formatDate(s.attempt.submittedAt) : "—"}
                  </span>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    Soal (bobot {s.question.points})
                  </div>
                  <div className="text-sm">{s.question.text}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                    Jawaban mahasiswa
                  </div>
                  <div className="text-sm whitespace-pre-line">{s.essayText || "(kosong)"}</div>
                </div>
                <GradeForm submissionId={s.id} maxPoints={s.question.points} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
