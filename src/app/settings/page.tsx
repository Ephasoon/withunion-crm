import { AppLayout } from "@/components/layout/app-layout";
import { Topbar } from "@/components/layout/topbar";
import { SettingsContent } from "@/components/settings/settings-content";

export const metadata = { title: "Settings — WithUnion CRM" };

export default function SettingsPage() {
  return (
    <AppLayout>
      <Topbar title="Settings" subtitle="Configure your organization, team, and preferences" />
      <div className="flex-1 overflow-y-auto">
        <SettingsContent />
      </div>
    </AppLayout>
  );
}
