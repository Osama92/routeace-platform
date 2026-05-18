import DashboardLayout from "@/components/layout/DashboardLayout";
import DeptTransporterManager from "@/components/dept/DeptTransporterManager";
import { useAuth } from "@/contexts/AuthContext";

export default function TransporterRoster() {
  const { organizationId, userRole, isSuperAdmin } = useAuth();

  // Heads (Super Admin / Org Admin / Logistics Head) approve.
  // Managers (Ops, Finance) generate invites and onboard.
  const approverRoles = ["super_admin", "org_admin", "admin"];
  const role: "manager" | "approver" =
    isSuperAdmin || approverRoles.includes(userRole || "") ? "approver" : "manager";

  return (
    <DashboardLayout title="3PL Transporter Roster">
      <div className="space-y-4 p-4">
        <div>
          <h1 className="text-2xl font-bold">3PL Transporter Roster</h1>
          <p className="text-sm text-muted-foreground">
            {role === "approver"
              ? "Review pending 3PL registrations, open uploaded documents, and approve or reject onboarding requests. All data is live."
              : "Add 3PL carriers, share an invite link with the agreed pricing/terms, and they'll self-register into your Transporter Portal."}
          </p>
        </div>
        {organizationId && <DeptTransporterManager orgId={organizationId} role={role} />}
      </div>
    </DashboardLayout>
  );
}
