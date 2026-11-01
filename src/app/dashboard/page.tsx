import { AppLayout } from "@/components/layout/app-layout";
import { Topbar } from "@/components/layout/topbar";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import { requireUser } from "@/lib/auth";

export const metadata = {
  title: "Dashboard — WithUnion CRM",
  description: "Real-time business intelligence dashboard",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.name.split(" ")[0];

  return (
    <AppLayout>
      <Topbar
        title="Dashboard"
        subtitle={`Welcome back, ${firstName}! Here's what's happening today.`}
      />
      <div className="flex-1 overflow-y-auto">
        <DashboardContent />
      </div>
    </AppLayout>
  );
}
