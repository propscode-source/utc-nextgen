import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isProctor } from "@/lib/proctor-perms";
import { SessionDetail } from "./session-detail";

export default async function ProctorSessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session) return null;
  if (!isProctor(session.user.role)) redirect("/dashboard");

  return <SessionDetail id={id} />;
}
