import { AppLayout } from "@/components/layout/app-layout";
import { Topbar } from "@/components/layout/topbar";
import { PipelineContent } from "@/components/pipeline/pipeline-content";

export const metadata = { title: "Pipeline — WithUnion CRM" };

export default function PipelinePage() {
  return (
    <AppLayout>
      <Topbar title="Sales Pipeline" subtitle="Track deals across your entire sales process" />
      <div className="flex-1 overflow-hidden">
        <PipelineContent />
      </div>
    </AppLayout>
  );
}
