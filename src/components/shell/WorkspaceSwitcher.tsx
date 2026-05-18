import {
  Truck, Factory, Ship, Landmark, ArrowLeftRight, Fingerprint,
  Code, Radio, Handshake, Crown, Check,
} from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { WorkspaceId } from "@/lib/workspace/workspaceRegistry";
import { getOSFamily, getVisibleWorkspacesForFamily } from "@/lib/workspace/osIsolation";
import { isInternalTeamRole } from "@/lib/workspace/workspaceRegistry";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Truck, Factory, Ship, Landmark, ArrowLeftRight, Fingerprint,
  Code, Radio, Handshake, Crown,
};

const COLOR_MAP: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20",
  blue: "bg-blue-500/15 text-blue-600 border-blue-500/20",
  violet: "bg-violet-500/15 text-violet-600 border-violet-500/20",
  amber: "bg-amber-500/15 text-amber-600 border-amber-500/20",
  orange: "bg-orange-500/15 text-orange-600 border-orange-500/20",
  teal: "bg-teal-500/15 text-teal-600 border-teal-500/20",
  slate: "bg-slate-500/15 text-slate-600 border-slate-500/20",
  red: "bg-red-500/15 text-red-600 border-red-500/20",
  pink: "bg-pink-500/15 text-pink-600 border-pink-500/20",
  yellow: "bg-yellow-500/15 text-yellow-600 border-yellow-500/20",
};

const WorkspaceSwitcher = () => {
  const { activeWorkspace, accessibleWorkspaces, switchWorkspace } = useWorkspace();
  const { userRole } = useAuth();

  const ActiveIcon = ICON_MAP[activeWorkspace.icon] || Truck;

  // OS Isolation: Only show workspaces within the same OS family.
  // Internal-core workspaces (Control Tower, Partner Console) are gated to
  // RouteAce Core staff - tenant super_admin does NOT unlock them.
  const currentFamily = getOSFamily(activeWorkspace.id);
  const internal = isInternalTeamRole(userRole);
  const visibleIds = getVisibleWorkspacesForFamily(currentFamily, internal);
  const filteredWorkspaces = accessibleWorkspaces.filter(ws => visibleIds.includes(ws.id));

  // If only one workspace visible, show static badge
  if (filteredWorkspaces.length <= 1) {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold",
        COLOR_MAP[activeWorkspace.color] || COLOR_MAP.emerald
      )}>
        <ActiveIcon className="w-3.5 h-3.5" />
        <span>{activeWorkspace.shortName}</span>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 border text-xs font-semibold h-8",
            COLOR_MAP[activeWorkspace.color] || COLOR_MAP.emerald
          )}
        >
          <ActiveIcon className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{activeWorkspace.shortName}</span>
          <svg className="w-3 h-3 opacity-50" viewBox="0 0 12 12" fill="none">
            <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Switch workspace
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {filteredWorkspaces.map((ws) => {
          const Icon = ICON_MAP[ws.icon] || Truck;
          const isActive = ws.id === activeWorkspace.id;
          return (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => switchWorkspace(ws.id as WorkspaceId)}
              className={cn(
                "flex items-center gap-3 py-2.5 cursor-pointer",
                isActive && "bg-muted"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border",
                COLOR_MAP[ws.color] || COLOR_MAP.emerald
              )}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ws.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{ws.description}</p>
              </div>
              {isActive && <Check className="w-4 h-4 text-primary shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WorkspaceSwitcher;
