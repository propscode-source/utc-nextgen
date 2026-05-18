import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { isAssistantOfAnyLab } from "@/lib/perms";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!session.user.emailVerified) {
    redirect(`/verify-email?email=${encodeURIComponent(session.user.email)}`);
  }

  const isLabAssistant =
    session.user.role === "MAHASISWA" ? await isAssistantOfAnyLab(session.user.id) : false;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={session.user.role} isLabAssistant={isLabAssistant} />
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <Topbar
          user={{
            name: session.user.name,
            email: session.user.email,
            image: session.user.image,
            role: session.user.role,
            points: session.user.points,
          }}
          isLabAssistant={isLabAssistant}
        />
        <main className="flex-1 overflow-y-auto scrollbar-hide p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
