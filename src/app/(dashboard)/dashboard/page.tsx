import { auth } from "@/auth";
import MahasiswaDashboard from "./mahasiswa";
import LabAdminDashboard from "./lab-admin";
import ProctorDashboard from "./proctor";
import SuperadminDashboard from "./superadmin";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) return null;

  switch (session.user.role) {
    case "SUPERADMIN":
      return <SuperadminDashboard />;
    case "LAB_ADMIN":
      return <LabAdminDashboard />;
    case "PROCTOR":
      return <ProctorDashboard />;
    case "MAHASISWA":
    default:
      return <MahasiswaDashboard />;
  }
}
