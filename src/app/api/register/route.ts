import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/zod-schemas";
import { awardPoints } from "@/lib/points";
import { PointEvent } from "@prisma/client";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Input tidak valid." },
      { status: 400 }
    );
  }
  const { email, nim, name, prodi, angkatan, password } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { nim }] },
    select: { id: true, email: true, nim: true },
  });
  if (existing) {
    const msg = existing.email === email ? "Email sudah terdaftar." : "NIM sudah terdaftar.";
    return NextResponse.json({ error: msg }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        nim,
        name,
        email,
        prodi,
        angkatan,
        password: passwordHash,
      },
    });
    await awardPoints({
      userId: u.id,
      event: PointEvent.REGISTER,
      reason: "Pendaftaran akun",
      tx,
    });
    return u;
  });

  // Issue verification token (valid 24h)
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);
  await prisma.verificationToken.create({
    data: { identifier: user.email, token, expires },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const verifyUrl = `${base}/verify/${token}`;

  await sendVerificationEmail(user.email, user.name, verifyUrl).catch((e) => {
    console.error("[register] sendVerificationEmail failed:", e);
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
