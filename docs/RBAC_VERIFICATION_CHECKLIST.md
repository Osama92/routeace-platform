# RouteAce RBAC Production Verification Checklist

## Overview

This document outlines the Role-Based Access Control (RBAC) system implemented for RouteAce, including the permission matrix, verification steps, and security considerations.

## Implemented Roles

| Role | Scope | Primary Responsibilities |
|------|-------|-------------------------|
| **Super Admin** | Platform | Manage organizations, subscriptions, platform settings |
| **Org Admin** | Organization | Manage users, company settings, final payout approval |
| **Ops Manager** | Operations | Dispatch management, fleet health, driver/vehicle assignment |
| **Finance Manager** | Finance | Invoices, expenses, first-stage payout approval, Zoho sync |
| **Dispatcher** | Dispatch | Create/assign trips, driver communication |
| **Driver** | Execution | Accept jobs, update delivery status, view earnings |
| **Customer** | Read-only | Track shipments, view/download invoices |

## Permission Matrix

### Platform Permissions (Super Admin Only)
- ✅ PLATFORM_VIEW
- ✅ PLATFORM_MANAGE_ORGS
- ✅ PLATFORM_MANAGE_SUBSCRIPTIONS
- ✅ PLATFORM_SUSPEND_ORGS

### Organization Permissions
| Permission | Super Admin | Org Admin | Ops Manager | Finance | Dispatcher | Driver | Customer |
|------------|-------------|-----------|-------------|---------|------------|--------|----------|
| ORG_VIEW | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| ORG_UPDATE | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| ORG_MANAGE_SETTINGS | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Dispatch Permissions
| Permission | Super Admin | Org Admin | Ops Manager | Finance | Dispatcher | Driver | Customer |
|------------|-------------|-----------|-------------|---------|------------|--------|----------|
| DISPATCH_VIEW | ❌ | ✅ | ✅ | ❌ | ✅ | Own only | ❌ |
| DISPATCH_CREATE | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| DISPATCH_UPDATE | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| DISPATCH_ASSIGN | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| DISPATCH_APPROVE | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| DISPATCH_UPDATE_STATUS | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |

### Finance Permissions
| Permission | Super Admin | Org Admin | Ops Manager | Finance | Dispatcher | Driver | Customer |
|------------|-------------|-----------|-------------|---------|------------|--------|----------|
| INVOICES_VIEW | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | Own only |
| INVOICES_CREATE | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| INVOICES_APPROVE | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| INVOICES_SYNC | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| PAYOUTS_CREATE | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| PAYOUTS_APPROVE_FINANCE | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| PAYOUTS_APPROVE_FINAL | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## Separation of Duties (Enforced)

1. **Finance cannot dispatch**
   - Finance Manager has no DISPATCH_CREATE or DISPATCH_ASSIGN permissions
   
2. **Ops cannot process payouts**
   - Ops Manager has no PAYOUTS_* permissions
   
3. **Dual-approval for payouts**
   - Stage 1: Finance Manager approval (PAYOUTS_APPROVE_FINANCE)
   - Stage 2: Org Admin approval (PAYOUTS_APPROVE_FINAL)

## Multi-Tenant Isolation

- All data access is scoped by `organization_id`
- RLS policies enforce organization isolation at database level
- API middleware validates organization membership
- Cross-org access attempts are logged and denied
- Super Admin has platform-wide visibility (read-only for client data)

## Security Audit Logging

### Logged Events
- ✅ Permission denials (action, user, role, resource)
- ✅ Cross-org access attempts
- ✅ Sensitive data access
- ✅ Financial record modifications
- ✅ User status changes (approval, suspension)
- ✅ Payout approvals (both stages)

### Audit Log Location
- Table: `audit_logs`
- Fields: action, table_name, record_id, user_id, user_email, old_data, new_data, created_at

## Production Verification Steps

### 1. Role Assignment Testing
```sql
-- Verify user has correct role
SELECT u.email, ur.role 
FROM auth.users u 
JOIN user_roles ur ON u.id = ur.user_id;
```

### 2. Permission Check Testing
For each role, verify:
- [ ] Can access allowed routes
- [ ] Cannot access restricted routes
- [ ] UI shows only permitted actions
- [ ] API calls fail with 403 for unauthorized actions

### 3. Multi-Tenant Isolation Testing
- [ ] User A (Org 1) cannot see User B (Org 2) data
- [ ] Cross-org API calls return 403
- [ ] Audit log captures cross-org attempts

### 4. Separation of Duties Testing
- [ ] Finance user cannot create dispatches
- [ ] Ops user cannot approve payouts
- [ ] Single user cannot approve their own payout

### 5. Audit Log Verification
```sql
-- Check permission denial logs
SELECT * FROM audit_logs 
WHERE action = 'permission_denied' 
ORDER BY created_at DESC LIMIT 20;

-- Check cross-org attempts
SELECT * FROM audit_logs 
WHERE action = 'cross_org_access_denied'
ORDER BY created_at DESC;
```

## UI Components

### Permission-Based Visibility
```tsx
// Single permission
<RequirePermission permission="DISPATCH_CREATE">
  <CreateDispatchButton />
</RequirePermission>

// Multiple permissions (any)
<RequirePermission permissions={["INVOICES_APPROVE", "INVOICES_SYNC"]}>
  <FinanceActions />
</RequirePermission>

// Role-based
<RoleGate allowedRoles={["org_admin", "super_admin"]}>
  <AdminPanel />
</RoleGate>
```

### usePermissions Hook
```tsx
const { can, canAny, canAll, role, isSuperAdmin, isFinanceManager } = usePermissions();

if (can("DISPATCH_CREATE")) {
  // Show create button
}
```

## API Middleware Usage

```typescript
import { checkPermission, checkOrgAccess, permissionDeniedResponse } from "../_shared/rbac-middleware.ts";

// In edge function
const { allowed, user, error } = await checkPermission(req, "DISPATCH_CREATE");
if (!allowed) {
  return permissionDeniedResponse(error);
}

// For org-scoped data
const orgCheck = await checkOrgAccess(req, targetOrgId);
if (!orgCheck.allowed) {
  return permissionDeniedResponse(orgCheck.error);
}
```

## Files Reference

| File | Purpose |
|------|---------|
| `src/lib/rbac/permissions.ts` | Permission matrix and helper functions |
| `src/hooks/usePermissions.ts` | React hook for permission checks |
| `src/components/rbac/RequirePermission.tsx` | UI permission wrapper component |
| `src/components/rbac/RoleBadge.tsx` | Role display badge |
| `supabase/functions/_shared/rbac-middleware.ts` | API permission middleware |

## Emergency Procedures

### Override Access (Admin Only)
1. Log into Supabase dashboard
2. Temporarily add required role to `user_roles` table
3. Document reason in audit_logs manually
4. Remove after action complete

### Lockout Recovery
1. Access Supabase dashboard directly
2. Reset user role in `user_roles`
3. Verify RLS policies are not blocking
