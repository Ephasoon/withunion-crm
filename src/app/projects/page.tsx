import { AppLayout } from "@/components/layout/app-layout";
import { Topbar } from "@/components/layout/topbar";
import { ProjectsContent } from "@/components/projects/projects-content";

export const metadata = { title: "Projects — WithUnion CRM" };

export default function ProjectsPage() {
  return (
    <AppLayout>
      <Topbar title="Projects" subtitle="Manage deliverables, tasks, and team progress" />
      <div className="flex-1 overflow-y-auto">
        <ProjectsContent />
      </div>
    </AppLayout>
  );
}
