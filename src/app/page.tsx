"use client";

import { WorkspaceProvider } from "@/lib/workspace/context";
import { WorkspaceShell } from "@/components/shell/WorkspaceShell";

export default function Page() {
  return (
    <WorkspaceProvider>
      <WorkspaceShell />
    </WorkspaceProvider>
  );
}
