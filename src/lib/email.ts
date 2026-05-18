import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "UTC NextGen <noreply@utc.unsri.ac.id>";

const resend = apiKey ? new Resend(apiKey) : null;

export async function sendVerificationEmail(to: string, name: string, url: string) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set — verification link:", url);
    return { skipped: true, url };
  }
  await resend.emails.send({
    from,
    to,
    subject: "Verifikasi email akun UTC NextGen",
    html: `
      <div style="font-family:system-ui,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px">
        <h2 style="color:#0f172a">Halo ${name},</h2>
        <p>Terima kasih sudah mendaftar di <strong>UTC NextGen — Unsri Training Center</strong>.</p>
        <p>Klik tombol di bawah untuk memverifikasi email kamu:</p>
        <p style="margin:24px 0">
          <a href="${url}" style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">
            Verifikasi Email
          </a>
        </p>
        <p style="color:#64748b;font-size:13px">Atau salin link ini ke browser: <br/>${url}</p>
        <p style="color:#64748b;font-size:12px;margin-top:32px">Link berlaku 24 jam. Abaikan email ini jika kamu tidak merasa mendaftar.</p>
      </div>
    `,
  });
  return { skipped: false };
}
