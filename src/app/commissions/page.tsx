import { AppLayout } from "@/components/layout/app-layout";
import { Topbar } from "@/components/layout/topbar";
import { CommissionsContent } from "@/components/commissions/commissions-content";

export const metadata = { title: "Commissions — WithUnion CRM" };

export default function CommissionsPage() {
  return (
    <AppLayout>
      <Topbar title="Commissions" subtitle="Track and manage sales representative commissions" />
      <div className="flex-1 overflow-y-auto">
        <CommissionsContent />
      </div>
    </AppLayout>
  );
}
