import { AppLayout } from "@/components/layout/app-layout";
import { Topbar } from "@/components/layout/topbar";
import { PaymentsContent } from "@/components/payments/payments-content";

export const metadata = { title: "Payments — WithUnion CRM" };

export default function PaymentsPage() {
  return (
    <AppLayout>
      <Topbar title="Payments" subtitle="Track all incoming payments and transaction history" />
      <div className="flex-1 overflow-y-auto">
        <PaymentsContent />
      </div>
    </AppLayout>
  );
}
