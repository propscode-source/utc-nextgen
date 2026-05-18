import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBolt } from "@fortawesome/free-solid-svg-icons";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-10 md:px-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 self-start">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <FontAwesomeIcon icon={faBolt} className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-bold leading-tight">UTC NextGen</div>
            <div className="text-[11px] text-muted-foreground leading-tight">Unsri Training Center</div>
          </div>
        </Link>
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </div>
      <div className="hidden md:flex relative items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-background overflow-hidden">
        <div className="absolute inset-0 opacity-30 [background:radial-gradient(circle_at_30%_30%,hsl(var(--primary)/.4),transparent_50%),radial-gradient(circle_at_70%_70%,hsl(var(--primary)/.2),transparent_50%)]" />
        <div className="relative z-10 max-w-md text-center px-6">
          <h2 className="text-2xl font-bold tracking-tight">Belajar. Berkembang. Bersertifikat.</h2>
          <p className="text-muted-foreground mt-3">
            Sistem training center terpusat dengan gamifikasi untuk 8 lab Fakultas Ilmu Komputer Unsri.
          </p>
        </div>
      </div>
    </div>
  );
}
