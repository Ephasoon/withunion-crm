import { AppLayout } from "@/components/layout/app-layout";
import { Topbar } from "@/components/layout/topbar";
import { AnalyticsContent } from "@/components/analytics/analytics-content";

export const metadata = { title: "Analytics — WithUnion CRM" };

export default function AnalyticsPage() {
  return (
    <AppLayout>
      <Topbar title="Analytics" subtitle="Revenue insights, forecasts, and business intelligence" />
      <div className="flex-1 overflow-y-auto">
        <AnalyticsContent />
      </div>
    </AppLayout>
  );
}
