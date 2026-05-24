import Image from "next/image";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faShieldHalved, faMedal, faCertificate, faGraduationCap } from "@fortawesome/free-solid-svg-icons";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-[100svh] w-full max-w-[100vw] md:grid-cols-2 overflow-x-hidden bg-background">
      {/* Left: form */}
      <div className="relative flex flex-col justify-center px-4 sm:px-6 py-8 sm:py-10 md:px-12">
        <div className="pointer-events-none absolute inset-0 bg-circuit opacity-40" />
        <Link href="/" className="relative mb-6 sm:mb-8 inline-flex items-center self-start">
          <Image
            src="/logo.png"
            alt="UTC NextGen — Unsri Training Center"
            width={1980}
            height={780}
            priority
            sizes="(max-width: 640px) 140px, (max-width: 1024px) 180px, 220px"
            className="h-10 sm:h-12 w-auto logo-adaptive"
          />
        </Link>
        <div className="relative mx-auto w-full max-w-sm">{children}</div>
      </div>

      {/* Right: tech panel */}
      <div className="relative hidden md:flex items-center justify-center overflow-hidden border-l border-primary/10 bg-gradient-to-br from-primary via-primary/95 to-[hsl(220_60%_14%)]">
        {/* Circuit pattern + radial glow on dark */}
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(to_right,hsl(0_0%_100%/.06)_1px,transparent_1px),linear-gradient(to_bottom,hsl(0_0%_100%/.06)_1px,transparent_1px)] [background-size:32px_32px]" />
        <div className="absolute inset-0 [background:radial-gradient(circle_at_25%_25%,hsl(var(--accent)/.25),transparent_45%),radial-gradient(circle_at_75%_75%,hsl(215_90%_60%/.3),transparent_50%)]" />
        <div className="absolute top-0 inset-x-0 h-px tech-scan opacity-70" />

        <div className="relative z-10 max-w-md px-8 text-center text-white">
          <div className="mx-auto inline-flex items-center rounded-full border border-white/20 bg-white/10 backdrop-blur px-3 py-1 text-[11px] font-medium uppercase tracking-wider">
            UTC NextGen Platform
          </div>
          <h2 className="mt-5 text-3xl font-bold tracking-tight">
            Belajar. Berkembang. <span className="text-accent">Bersertifikat.</span>
          </h2>
          <p className="mt-3 text-white/80">
            Sistem training center terpusat dengan gamifikasi untuk 8 lab Fakultas Ilmu Komputer Unsri.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 text-left">
            <FeaturePill icon={faGraduationCap} text="LMS bertingkat" />
            <FeaturePill icon={faShieldHalved} text="Ujian diawasi" />
            <FeaturePill icon={faMedal} text="Gamifikasi" />
            <FeaturePill icon={faCertificate} text="Sertifikat resmi" />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturePill({ icon, text }: { icon: typeof faShieldHalved; text: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs backdrop-blur">
      <span className="grid h-6 w-6 place-items-center rounded bg-accent/20 text-accent">
        <FontAwesomeIcon icon={icon} className="h-3 w-3" />
      </span>
      <span className="text-white/90">{text}</span>
    </div>
  );
}
