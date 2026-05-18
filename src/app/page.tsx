import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt, faGraduationCap, faMedal, faCertificate, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <header className="container flex items-center justify-between py-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <FontAwesomeIcon icon={faBolt} className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-bold leading-tight">UTC NextGen</div>
            <div className="text-[11px] text-muted-foreground leading-tight">Unsri Training Center</div>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/login">Masuk</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Daftar gratis</Link>
          </Button>
        </div>
      </header>

      <section className="container flex-1 grid place-items-center text-center py-16">
        <div className="max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Training Center Terpusat untuk <span className="text-primary">8 Lab Fasilkom Unsri</span>
          </h1>
          <p className="mt-5 text-muted-foreground md:text-lg">
            Kumpulkan poin, raih badge, lulus ujian, dapatkan sertifikat resmi. Satu sistem untuk semua aktivitas
            pelatihan laboratorium.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" asChild>
              <Link href="/register">
                <FontAwesomeIcon icon={faGraduationCap} /> Mulai belajar (+100 poin)
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sudah punya akun? Masuk</Link>
            </Button>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 text-left">
            <Feature icon={faGraduationCap} title="LMS Bertingkat" desc="Quiz wajib per section sebelum lanjut." />
            <Feature icon={faShieldHalved} title="Ujian Diawasi" desc="Anti-cheating real-time oleh proktor." />
            <Feature icon={faMedal} title="Gamifikasi" desc="Poin, badge, dan leaderboard kompetitif." />
            <Feature icon={faCertificate} title="Sertifikat Resmi" desc="PDF + QR code, verifikasi publik." />
          </div>
        </div>
      </section>

      <footer className="container py-6 text-center text-xs text-muted-foreground border-t">
        © {new Date().getFullYear()} UTC NextGen — Fakultas Ilmu Komputer Universitas Sriwijaya.
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: typeof faBolt; title: string; desc: string }) {
  return (
    <div className="rounded-lg border p-4 bg-card">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
        <FontAwesomeIcon icon={icon} className="h-4 w-4" />
      </div>
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{desc}</p>
    </div>
  );
}
