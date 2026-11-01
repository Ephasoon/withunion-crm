import { AppLayout } from "@/components/layout/app-layout";
import { Topbar } from "@/components/layout/topbar";
import { AIAssistant } from "@/components/ai/ai-assistant";

export const metadata = { title: "AI Assistant — WithUnion CRM" };

export default function AIPage() {
  return (
    <AppLayout>
      <Topbar title="AI Assistant" subtitle="Your intelligent business co-pilot powered by AI" />
      <div className="flex-1 overflow-hidden">
        <AIAssistant />
      </div>
    </AppLayout>
  );
}
