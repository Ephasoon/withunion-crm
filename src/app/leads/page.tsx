import { AppLayout } from "@/components/layout/app-layout";
import { Topbar } from "@/components/layout/topbar";
import { LeadsContent } from "@/components/leads/leads-content";

export const metadata = {
  title: "Leads — WithUnion CRM",
  description: "Manage and track all your leads",
};

export default function LeadsPage() {
  return (
    <AppLayout>
      <Topbar title="Leads" subtitle="Track, score, and convert your leads into clients" />
      <div className="flex-1 overflow-y-auto">
        <LeadsContent />
      </div>
    </AppLayout>
  );
}
