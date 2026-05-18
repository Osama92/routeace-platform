import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Breadcrumbs from "./Breadcrumbs";
import { MobileSidebarProvider, useMobileSidebar } from "@/contexts/MobileSidebarContext";
import { OnboardingTeleprompter } from "@/components/guidance/OnboardingTeleprompter";
import AICoach from "@/components/guidance/AICoach";
import UniversalCommandBar from "@/components/command/UniversalCommandBar";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAutoStaffSignin } from "@/hooks/useAutoStaffSignin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

const DashboardLayout = ({ children, title, subtitle }: DashboardLayoutProps) => {
  const { loading, organizationId, isSuperAdmin, hasAnyRole, signOut } = useAuth();
  const navigate = useNavigate();
  useAutoStaffSignin();

  const isAdmin = hasAnyRole(["super_admin", "org_admin", "admin"]);

  // P12: Realtime notifications for admins - pending profiles + new leave requests
  useEffect(() => {
    if (!isAdmin || !organizationId) return;

    const profileChannel = supabase
      .channel("admin-pending-profiles")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "profiles",
          filter: "approval_status=eq.pending",
        },
        (payload) => {
          const name = (payload.new as any)?.full_name || (payload.new as any)?.email || "A new user";
          toast.info("New user awaiting approval", {
            description: `${name} has registered and needs approval.`,
            action: {
              label: "Review",
              onClick: () => navigate("/users?tab=pending"),
            },
          });
        }
      )
      .subscribe();

    const leaveChannel = supabase
      .channel(`admin-leave-requests:${organizationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "leave_requests",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          const type = (payload.new as any)?.leave_type || "leave";
          toast.info("New leave request", {
            description: `A team member submitted a ${type} request.`,
            action: {
              label: "Review",
              onClick: () => navigate("/workforce/leave-inbox"),
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(leaveChannel);
    };
  }, [isAdmin, organizationId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="hidden lg:flex w-[280px] h-screen bg-sidebar border-r border-sidebar-border p-4 shrink-0 flex-col gap-4">
          <Skeleton className="h-10 w-full rounded-xl" />
          <Skeleton className="h-6 w-3/4" />
          <div className="space-y-2 mt-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        </div>
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // P14: Super admin without an organization → guided recovery instead of broken empty dashboard
  if (isSuperAdmin && organizationId === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 shadow-lg space-y-6">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-full bg-warning/15 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-warning" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              Company setup incomplete
            </h2>
            <p className="text-sm text-muted-foreground">
              Your account doesn't have a company linked yet. This usually means signup
              didn't complete fully. Let's fix that now.
            </p>
          </div>
          <div className="space-y-2">
            <Button className="w-full" onClick={() => navigate("/signup/company")}>
              Complete Company Setup
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => signOut()}>
              Sign out and try again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MobileSidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <MobileBackdrop />
        <main className="lg:ml-[280px] transition-all duration-300 min-w-0">
          <Header title={title} subtitle={subtitle} />
          <Breadcrumbs />
          <div className="p-4 sm:p-6 lg:p-8 min-w-0">{children}</div>
        </main>
        <UniversalCommandBar />
        <OnboardingTeleprompter />
        <AICoach />
      </div>
    </MobileSidebarProvider>
  );
};

// Dim background when mobile drawer is open
const MobileBackdrop = () => {
  const { open, setOpen } = useMobileSidebar();
  if (!open) return null;
  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
      aria-hidden
    />
  );
};

export default DashboardLayout;
