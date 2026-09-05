"use client";

import { WorkspaceProvider } from "@/lib/workspace/context";
import { DesktopShell } from "@/components/desktop/DesktopShell";

export default function Page() {
  return (
    <WorkspaceProvider>
      <DesktopShell />
    </WorkspaceProvider>
  );
}
