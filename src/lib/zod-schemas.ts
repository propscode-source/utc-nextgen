import { z } from "zod";

export const registerSchema = z
  .object({
    nim: z
      .string()
      .min(8, "NIM minimal 8 karakter")
      .max(20, "NIM maksimal 20 karakter")
      .regex(/^[0-9]+$/, "NIM hanya angka"),
    name: z.string().min(2, "Nama minimal 2 karakter").max(100),
    email: z.string().email("Email tidak valid"),
    prodi: z.string().min(2, "Prodi wajib diisi").max(100),
    angkatan: z
      .number({ invalid_type_error: "Angkatan harus angka" })
      .int()
      .min(2000, "Angkatan tidak valid")
      .max(new Date().getFullYear() + 1, "Angkatan tidak valid"),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(72, "Password maksimal 72 karakter"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100),
  prodi: z.string().min(2).max(100).optional().nullable(),
  angkatan: z.number().int().min(2000).max(new Date().getFullYear() + 1).optional().nullable(),
  image: z.string().url().optional().nullable(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
