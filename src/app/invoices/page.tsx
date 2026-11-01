import { AppLayout } from "@/components/layout/app-layout";
import { Topbar } from "@/components/layout/topbar";
import { InvoicesContent } from "@/components/invoices/invoices-content";

export const metadata = { title: "Invoices — WithUnion CRM" };

export default function InvoicesPage() {
  return (
    <AppLayout>
      <Topbar title="Invoices" subtitle="Create, send, and track invoices and payments" />
      <div className="flex-1 overflow-y-auto">
        <InvoicesContent />
      </div>
    </AppLayout>
  );
}
