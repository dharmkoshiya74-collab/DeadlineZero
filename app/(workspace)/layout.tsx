import type { ReactNode } from "react";
import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspaceProvider } from "@/lib/workspace-context";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return (
    <WorkspaceProvider>
      <WorkspaceShell>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}
