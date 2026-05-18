import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  WorkspaceId,
  WorkspaceDefinition,
  WORKSPACE_REGISTRY,
  getAccessibleWorkspaces,
  resolveWorkspaceFromRoute,
} from "@/lib/workspace/workspaceRegistry";

interface WorkspaceContextType {
  activeWorkspace: WorkspaceDefinition;
  accessibleWorkspaces: WorkspaceDefinition[];
  switchWorkspace: (id: WorkspaceId) => void;
  isMultiWorkspace: boolean;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
};

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const { userRole, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const accessibleWorkspaces = getAccessibleWorkspaces(userRole, isSuperAdmin);

  const [activeId, setActiveId] = useState<WorkspaceId>(() =>
    resolveWorkspaceFromRoute(location.pathname)
  );

  // Sync workspace when route changes
  useEffect(() => {
    const resolved = resolveWorkspaceFromRoute(location.pathname);
    if (resolved !== activeId) {
      setActiveId(resolved);
    }
  }, [location.pathname]);

  const activeWorkspace = WORKSPACE_REGISTRY[activeId] || WORKSPACE_REGISTRY.logistics;

  const switchWorkspace = (id: WorkspaceId) => {
    const ws = WORKSPACE_REGISTRY[id];
    if (!ws) return;
    setActiveId(id);
    navigate(ws.defaultRoute);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspace,
        accessibleWorkspaces,
        switchWorkspace,
        isMultiWorkspace: accessibleWorkspaces.length > 1,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};
