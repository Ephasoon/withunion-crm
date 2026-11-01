import { AppLayout } from "@/components/layout/app-layout";
import { Topbar } from "@/components/layout/topbar";
import { ClientsContent } from "@/components/clients/clients-content";

export const metadata = {
  title: "Clients — WithUnion CRM",
};

export default function ClientsPage() {
  return (
    <AppLayout>
      <Topbar title="Clients" subtitle="Manage your client relationships and accounts" />
      <div className="flex-1 overflow-y-auto">
        <ClientsContent />
      </div>
    </AppLayout>
  );
}
