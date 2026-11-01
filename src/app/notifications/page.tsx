import { AppLayout } from "@/components/layout/app-layout";
import { Topbar } from "@/components/layout/topbar";
import { NotificationsContent } from "@/components/notifications/notifications-content";

export const metadata = { title: "Notifications — WithUnion CRM" };

export default function NotificationsPage() {
  return (
    <AppLayout>
      <Topbar title="Notifications" subtitle="Stay on top of important updates and alerts" />
      <div className="flex-1 overflow-y-auto">
        <NotificationsContent />
      </div>
    </AppLayout>
  );
}
