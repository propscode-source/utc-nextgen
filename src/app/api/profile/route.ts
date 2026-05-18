import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { profileUpdateSchema } from "@/lib/zod-schemas";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  const parsed = profileUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
      { status: 400 }
    );
  }

  const { name, prodi, angkatan, image } = parsed.data;
  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name,
      prodi: prodi ?? null,
      angkatan: angkatan ?? null,
      image: image ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
