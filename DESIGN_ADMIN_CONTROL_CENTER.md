# 🛡️ ADMIN CONTROL CENTER - Complete Design Specification

**Date:** 2026-08-15  
**Priority:** HIGH - Required for Production  
**Estimated Effort:** 2-3 weeks  
**Status:** DESIGN COMPLETE - Ready for Implementation

---

## 📋 EXECUTIVE SUMMARY

Design a centralized Admin Control Center that gives platform administrators complete control over users, access, features, and usage.

**Core Principle:** **Least Privilege by Default** - Users get minimal permissions, admins grant access explicitly.

---

## 🎯 REQUIREMENTS

### Functional Requirements:
1. ✅ User lifecycle management (create, suspend, enable, delete, expire)
2. ✅ Role and permission management (flexible, granular)
3. ✅ Feature-level access control (per-user, per-feature)
4. ✅ Platform account access control (which users can use which accounts)
5. ✅ Usage limits and enforcement (leads/month, campaigns/month, etc.)
6. ✅ Session management (view active sessions, force logout)
7. ✅ Admin audit trail (track all admin actions)
8. ✅ Bulk operations (suspend 100 users at once)
9. ✅ User impersonation (for support)
10. ✅ Dashboard with key metrics

### Non-Functional Requirements:
1. ✅ Fast (operations complete in <2s)
2. ✅ Secure (admin actions require confirmation)
3. ✅ Auditable (every change is logged)
4. ✅ Flexible (easy to add new permissions)

---

## 💾 DATABASE SCHEMA ADDITIONS

### 1. Enhanced User Model

```prisma
model User {
  // ... existing fields ...
  
  // Lifecycle management
  status            UserStatus        @default(ACTIVE)
  suspendedAt       DateTime?
  suspendedBy       String?           // Admin user ID
  suspendedReason   String?
  expiresAt         DateTime?         // Account expiration
  
  // Access control
  roleId            String?
  customPermissions String[]          // Override role permissions
  featureAccess     Json?             // { "campaigns": true, "leads": false }
  platformAccess    String[]          // ["facebook", "instagram"]
  
  // Usage tracking
  usageLimits       UsageLimits?
  currentUsage      UserUsage?
  
  // Security
  lastLoginAt       DateTime?
  lastLoginIp       String?
  mfaEnabled        Boolean           @default(false)
  mfaSecret         String?
  
  // Relations
  role              Role?             @relation(fields: [roleId], references: [id])
  sessions          Session[]
  impersonations    Impersonation[]
  adminActions      AdminAction[]     // Actions this user performed as admin
}

enum UserStatus {
  ACTIVE
  SUSPENDED
  EXPIRED
  PENDING_VERIFICATION
  DELETED
}
```

### 2. New Role Model (Flexible RBAC)

```prisma
model Role {
  id          String   @id @default(uuid())
  tenantId    String
  name        String
  slug        String   // admin, manager, user, viewer, custom-1
  description String?
  
  // Permission sets
  permissions String[] // ["user.read", "user.write", "campaign.create"]
  
  // Feature access
  featureAccess Json   // { "campaigns": true, "leads": true, "ai": false }
  
  // Platform access  
  platformAccess String[] // ["facebook", "instagram"] or ["*"] for all
  
  // Metadata
  isDefault   Boolean  @default(false)
  isSystem    Boolean  @default(false) // Can't be deleted
  priority    Int      @default(0)     // Higher priority = more permissions
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  users       User[]
  
  @@unique([tenantId, slug])
  @@map("roles")
}
```

### 3. Permission Registry (Centralized)

```prisma
model Permission {
  id          String   @id @default(uuid())
  key         String   @unique // "user.read", "campaign.create"
  name        String   // "Read Users"
  description String?
  category    String   // "users", "campaigns", "leads"
  isSystem    Boolean  @default(true)
  createdAt   DateTime @default(now())
  
  @@map("permissions")
}
```

### 4. Usage Limits & Tracking

```prisma
model UsageLimits {
  id                    String  @id @default(uuid())
  userId                String  @unique
  
  // Limits (null = unlimited)
  leadsPerMonth         Int?
  campaignsPerMonth     Int?
  platformAccountsMax   Int?
  aiTokensPerMonth      Int?
  storageGB             Float?
  teamsMax              Int?
  
  // Alert thresholds (%)
  alertAt               Int     @default(80)
  
  user                  User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("usage_limits")
}

model UserUsage {
  id                    String   @id @default(uuid())
  userId                String   @unique
  month                 String   // "2026-08"
  
  // Current usage
  leadsCollected        Int      @default(0)
  campaignsRun          Int      @default(0)
  platformAccountsUsed  Int      @default(0)
  aiTokensUsed          Int      @default(0)
  storageUsedGB         Float    @default(0)
  
  // Timestamps
  resetAt               DateTime
  updatedAt             DateTime @updatedAt
  
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("user_usage")
}
```

### 5. Session Management

```prisma
model Session {
  id           String    @id @default(uuid())
  userId       String
  token        String    @unique
  
  // Session details
  ipAddress    String
  userAgent    String
  deviceType   String?   // "desktop", "mobile", "tablet"
  deviceName   String?
  location     String?   // City, Country from IP
  
  // Lifecycle
  createdAt    DateTime  @default(now())
  expiresAt    DateTime
  lastActiveAt DateTime  @default(now())
  revokedAt    DateTime?
  revokedBy    String?   // Admin user ID
  revokedReason String?
  
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, expiresAt])
  @@map("sessions")
}
```

### 6. Admin Audit Trail

```prisma
model AdminAction {
  id          String   @id @default(uuid())
  tenantId    String
  adminId     String
  
  // Action details
  action      String   // "user.suspend", "role.create"
  resource    String   // "User:uuid-123"
  changes     Json     // Before/after state
  reason      String?
  
  // Context
  ipAddress   String
  userAgent   String
  
  createdAt   DateTime @default(now())
  
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  admin       User     @relation(fields: [adminId], references: [id], onDelete: Cascade)
  
  @@index([tenantId, createdAt])
  @@index([adminId, createdAt])
  @@map("admin_actions")
}
```

### 7. User Impersonation (Support)

```prisma
model Impersonation {
  id          String    @id @default(uuid())
  adminId     String
  targetUserId String
  
  // Session details
  reason      String
  startedAt   DateTime  @default(now())
  endedAt     DateTime?
  
  // Context
  ipAddress   String
  actions     Json[]    // Track actions taken during impersonation
  
  admin       User      @relation("ImpersonatedBy", fields: [adminId], references: [id])
  target      User      @relation("Impersonations", fields: [targetUserId], references: [id])
  
  @@index([adminId, startedAt])
  @@map("impersonations")
}
```

---

## 🔧 BACKEND API IMPLEMENTATION

### Admin Module Structure

```
apps/api/src/admin/
├── admin.module.ts
├── admin.controller.ts
├── services/
│   ├── user-management.service.ts
│   ├── role-management.service.ts
│   ├── permission.service.ts
│   ├── usage-tracking.service.ts
│   ├── session-management.service.ts
│   ├── audit.service.ts
│   └── impersonation.service.ts
├── dto/
│   ├── user-management.dto.ts
│   ├── role.dto.ts
│   ├── permission.dto.ts
│   └── usage.dto.ts
├── guards/
│   ├── admin.guard.ts
│   └── super-admin.guard.ts
└── decorators/
    └── admin-action.decorator.ts
```

### Key Services

#### 1. UserManagementService

```typescript
@Injectable()
export class UserManagementService {
  /**
   * Suspend user account
   */
  async suspendUser(
    adminId: string,
    userId: string,
    reason: string,
  ): Promise<User> {
    // 1. Check admin has permission
    await this.checkPermission(adminId, 'user.suspend');
    
    // 2. Get user
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    // 3. Update status
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.SUSPENDED,
        suspendedAt: new Date(),
        suspendedBy: adminId,
        suspendedReason: reason,
      },
    });
    
    // 4. Revoke all sessions
    await this.sessionManagement.revokeAllSessions(userId, adminId, 'user_suspended');
    
    // 5. Log action
    await this.audit.log({
      adminId,
      action: 'user.suspend',
      resource: `User:${userId}`,
      changes: { before: { status: user.status }, after: { status: UserStatus.SUSPENDED } },
      reason,
    });
    
    // 6. Send notification
    await this.notifications.send(userId, {
      type: 'account_suspended',
      reason,
    });
    
    return updated;
  }
  
  /**
   * Enable user account
   */
  async enableUser(adminId: string, userId: string): Promise<User> {
    await this.checkPermission(adminId, 'user.enable');
    
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        status: UserStatus.ACTIVE,
        suspendedAt: null,
        suspendedBy: null,
        suspendedReason: null,
      },
    });
    
    await this.audit.log({
      adminId,
      action: 'user.enable',
      resource: `User:${userId}`,
      changes: { before: { status: user.status }, after: { status: UserStatus.ACTIVE } },
    });
    
    await this.notifications.send(userId, {
      type: 'account_enabled',
    });
    
    return updated;
  }
  
  /**
   * Set account expiration
   */
  async setExpiration(
    adminId: string,
    userId: string,
    expiresAt: Date,
  ): Promise<User> {
    await this.checkPermission(adminId, 'user.update');
    
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { expiresAt },
    });
    
    await this.audit.log({
      adminId,
      action: 'user.set_expiration',
      resource: `User:${userId}`,
      changes: { expiresAt },
    });
    
    return updated;
  }
  
  /**
   * Bulk suspend users
   */
  async bulkSuspend(
    adminId: string,
    userIds: string[],
    reason: string,
  ): Promise<{ suspended: number; failed: number }> {
    await this.checkPermission(adminId, 'user.bulk_suspend');
    
    let suspended = 0;
    let failed = 0;
    
    for (const userId of userIds) {
      try {
        await this.suspendUser(adminId, userId, reason);
        suspended++;
      } catch (error) {
        failed++;
        this.logger.error(`Failed to suspend user ${userId}:`, error);
      }
    }
    
    await this.audit.log({
      adminId,
      action: 'user.bulk_suspend',
      resource: 'User:bulk',
      changes: { userIds, suspended, failed },
      reason,
    });
    
    return { suspended, failed };
  }
}
```

#### 2. RoleManagementService

```typescript
@Injectable()
export class RoleManagementService {
  /**
   * Create custom role
   */
  async createRole(
    adminId: string,
    tenantId: string,
    dto: CreateRoleDto,
  ): Promise<Role> {
    await this.checkPermission(adminId, 'role.create');
    
    // Validate permissions exist
    await this.validatePermissions(dto.permissions);
    
    const role = await this.prisma.role.create({
      data: {
        tenantId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        permissions: dto.permissions,
        featureAccess: dto.featureAccess,
        platformAccess: dto.platformAccess,
        priority: dto.priority || 0,
      },
    });
    
    await this.audit.log({
      adminId,
      action: 'role.create',
      resource: `Role:${role.id}`,
      changes: { created: role },
    });
    
    return role;
  }
  
  /**
   * Assign role to user
   */
  async assignRole(
    adminId: string,
    userId: string,
    roleId: string,
  ): Promise<User> {
    await this.checkPermission(adminId, 'user.assign_role');
    
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { roleId },
    });
    
    await this.audit.log({
      adminId,
      action: 'user.assign_role',
      resource: `User:${userId}`,
      changes: {
        before: { roleId: user.roleId },
        after: { roleId },
        roleName: role.name,
      },
    });
    
    return updated;
  }
  
  /**
   * Grant custom permission to user (override role)
   */
  async grantPermission(
    adminId: string,
    userId: string,
    permission: string,
  ): Promise<User> {
    await this.checkPermission(adminId, 'user.grant_permission');
    
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const permissions = user.customPermissions || [];
    
    if (!permissions.includes(permission)) {
      permissions.push(permission);
    }
    
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { customPermissions: permissions },
    });
    
    await this.audit.log({
      adminId,
      action: 'user.grant_permission',
      resource: `User:${userId}`,
      changes: { permission },
    });
    
    return updated;
  }
}
```

#### 3. UsageTrackingService

```typescript
@Injectable()
export class UsageTrackingService {
  /**
   * Track usage and check limits
   */
  async trackUsage(
    userId: string,
    resource: ResourceType,
    amount: number = 1,
  ): Promise<{ allowed: boolean; remaining: number; limit: number }> {
    const month = format(new Date(), 'yyyy-MM');
    
    // Get or create usage record
    let usage = await this.prisma.userUsage.findUnique({
      where: { userId_month: { userId, month } },
    });
    
    if (!usage) {
      usage = await this.prisma.userUsage.create({
        data: {
          userId,
          month,
          resetAt: endOfMonth(new Date()),
        },
      });
    }
    
    // Get limits
    const limits = await this.prisma.usageLimits.findUnique({
      where: { userId },
    });
    
    // Check specific resource
    const field = this.getUsageField(resource);
    const limitField = this.getLimitField(resource);
    
    const current = usage[field] || 0;
    const limit = limits?.[limitField];
    
    // No limit set = unlimited
    if (limit === null || limit === undefined) {
      await this.incrementUsage(userId, month, field, amount);
      return { allowed: true, remaining: Infinity, limit: Infinity };
    }
    
    // Check if within limit
    const allowed = current + amount <= limit;
    const remaining = Math.max(0, limit - current - amount);
    
    if (allowed) {
      await this.incrementUsage(userId, month, field, amount);
      
      // Alert if near limit
      if (limits.alertAt && ((current + amount) / limit) * 100 >= limits.alertAt) {
        await this.sendLimitWarning(userId, resource, remaining, limit);
      }
    }
    
    return { allowed, remaining, limit };
  }
  
  /**
   * Set user usage limits
   */
  async setLimits(
    adminId: string,
    userId: string,
    limits: Partial<UsageLimits>,
  ): Promise<UsageLimits> {
    await this.checkPermission(adminId, 'user.set_limits');
    
    const updated = await this.prisma.usageLimits.upsert({
      where: { userId },
      update: limits,
      create: { userId, ...limits },
    });
    
    await this.audit.log({
      adminId,
      action: 'user.set_limits',
      resource: `User:${userId}`,
      changes: { limits },
    });
    
    return updated;
  }
}
```

---

## 🖥️ FRONTEND IMPLEMENTATION

### Admin Pages Structure

```
apps/web/src/app/admin/
├── page.tsx                      # Admin dashboard
├── users/
│   ├── page.tsx                  # User list
│   ├── [id]/
│   │   ├── page.tsx              # User details
│   │   ├── edit/page.tsx         # Edit user
│   │   ├── permissions/page.tsx  # Manage permissions
│   │   └── usage/page.tsx        # Usage details
│   └── bulk/page.tsx             # Bulk operations
├── roles/
│   ├── page.tsx                  # Role list
│   ├── create/page.tsx           # Create role
│   └── [id]/page.tsx             # Edit role
├── permissions/
│   └── page.tsx                  # Permission registry
├── sessions/
│   └── page.tsx                  # Active sessions
├── audit/
│   └── page.tsx                  # Audit trail
└── usage/
    └── page.tsx                  # Usage analytics
```

### Key UI Components

#### Admin Dashboard

```typescript
export default function AdminDashboard() {
  return (
    <div className="p-6">
      <h1>Admin Control Center</h1>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <MetricCard
          title="Total Users"
          value={stats.totalUsers}
          change={stats.userGrowth}
          icon={Users}
        />
        <MetricCard
          title="Active Today"
          value={stats.activeToday}
          icon={Activity}
        />
        <MetricCard
          title="Suspended"
          value={stats.suspended}
          icon={Ban}
          variant="warning"
        />
        <MetricCard
          title="Near Limits"
          value={stats.nearLimits}
          icon={AlertTriangle}
          variant="danger"
        />
      </div>
      
      {/* Quick Actions */}
      <div className="mt-8">
        <h2>Quick Actions</h2>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <QuickAction
            title="Manage Users"
            href="/admin/users"
            icon={Users}
          />
          <QuickAction
            title="Roles & Permissions"
            href="/admin/roles"
            icon={Shield}
          />
          <QuickAction
            title="View Audit Trail"
            href="/admin/audit"
            icon={FileText}
          />
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="mt-8">
        <h2>Recent Admin Actions</h2>
        <AdminActionList actions={recentActions} />
      </div>
      
      {/* Usage Overview */}
      <div className="mt-8">
        <h2>Platform Usage</h2>
        <UsageCharts data={usageData} />
      </div>
    </div>
  );
}
```

#### User Management Table

```typescript
export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<UserFilters>({});
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  
  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <h1>User Management</h1>
        <Button href="/admin/users/create">Add User</Button>
      </div>
      
      {/* Filters */}
      <div className="flex gap-4 mt-6">
        <Select
          value={filters.status}
          onChange={(v) => setFilters({ ...filters, status: v })}
          options={[
            { value: 'all', label: 'All Users' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'SUSPENDED', label: 'Suspended' },
            { value: 'EXPIRED', label: 'Expired' },
          ]}
        />
        <Select
          value={filters.role}
          onChange={(v) => setFilters({ ...filters, role: v })}
          options={roleOptions}
        />
        <Input
          placeholder="Search users..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
      </div>
      
      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="flex gap-2 mt-4 p-4 bg-blue-50 rounded">
          <span>{selectedUsers.length} users selected</span>
          <Button
            variant="secondary"
            onClick={() => handleBulkSuspend(selectedUsers)}
          >
            Suspend Selected
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleBulkSetRole(selectedUsers)}
          >
            Assign Role
          </Button>
        </div>
      )}
      
      {/* User Table */}
      <Table className="mt-6">
        <TableHead>
          <TableRow>
            <TableCell>
              <Checkbox
                checked={selectedUsers.length === users.length}
                onChange={handleSelectAll}
              />
            </TableCell>
            <TableCell>User</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Last Login</TableCell>
            <TableCell>Usage</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <Checkbox
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => handleSelectUser(user.id)}
                />
              </TableCell>
              <TableCell>
                <UserAvatar user={user} />
                {user.name}
              </TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge>{user.role?.name || 'No Role'}</Badge>
              </TableCell>
              <TableCell>
                <StatusBadge status={user.status} />
              </TableCell>
              <TableCell>
                {user.lastLoginAt
                  ? formatDistanceToNow(user.lastLoginAt)
                  : 'Never'}
              </TableCell>
              <TableCell>
                <UsageIndicator usage={user.currentUsage} limits={user.usageLimits} />
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownItem onClick={() => router.push(`/admin/users/${user.id}`)}>
                    View Details
                  </DropdownItem>
                  <DropdownItem onClick={() => handleSuspend(user.id)}>
                    Suspend
                  </DropdownItem>
                  <DropdownItem onClick={() => handleImpersonate(user.id)}>
                    Impersonate
                  </DropdownItem>
                  <DropdownItem onClick={() => handleRevokeSessions(user.id)}>
                    Revoke Sessions
                  </DropdownItem>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```

---

## 🔒 PERMISSION SYSTEM

### Permission Registry (Comprehensive)

```typescript
export const PERMISSIONS = {
  // User Management
  'user.read': 'View users',
  'user.create': 'Create users',
  'user.update': 'Update user details',
  'user.delete': 'Delete users',
  'user.suspend': 'Suspend user accounts',
  'user.enable': 'Enable user accounts',
  'user.assign_role': 'Assign roles to users',
  'user.grant_permission': 'Grant custom permissions',
  'user.set_limits': 'Set usage limits',
  'user.bulk_suspend': 'Bulk suspend users',
  'user.impersonate': 'Impersonate users',
  
  // Role Management
  'role.read': 'View roles',
  'role.create': 'Create roles',
  'role.update': 'Update roles',
  'role.delete': 'Delete roles',
  
  // Campaign Management
  'campaign.read': 'View campaigns',
  'campaign.create': 'Create campaigns',
  'campaign.update': 'Update campaigns',
  'campaign.delete': 'Delete campaigns',
  'campaign.execute': 'Execute campaigns',
  'campaign.pause': 'Pause campaigns',
  
  // Lead Management
  'lead.read': 'View leads',
  'lead.create': 'Create leads',
  'lead.update': 'Update leads',
  'lead.delete': 'Delete leads',
  'lead.collect': 'Collect leads from sources',
  'lead.enrich': 'Enrich lead data',
  'lead.export': 'Export leads',
  
  // Platform Management
  'platform.read': 'View connected platforms',
  'platform.connect': 'Connect platform accounts',
  'platform.disconnect': 'Disconnect platforms',
  'platform.post': 'Create posts',
  
  // Workflow Management
  'workflow.read': 'View workflows',
  'workflow.create': 'Create workflows',
  'workflow.update': 'Update workflows',
  'workflow.delete': 'Delete workflows',
  'workflow.execute': 'Execute workflows',
  
  // Analytics
  'analytics.read': 'View analytics',
  'analytics.export': 'Export analytics',
  
  // Admin
  'admin.dashboard': 'Access admin dashboard',
  'admin.audit': 'View audit trail',
  'admin.system_settings': 'Modify system settings',
  
  // Tenant Management
  'tenant.read': 'View tenant details',
  'tenant.update': 'Update tenant settings',
  'tenant.delete': 'Delete tenant',
  
  // Session Management
  'session.read': 'View sessions',
  'session.revoke': 'Revoke sessions',
} as const;

export type Permission = keyof typeof PERMISSIONS;
```

### Default Role Definitions

```typescript
export const DEFAULT_ROLES = {
  SUPER_ADMIN: {
    name: 'Super Admin',
    slug: 'super-admin',
    permissions: ['*'], // All permissions
    featureAccess: { '*': true },
    platformAccess: ['*'],
    priority: 100,
    isSystem: true,
  },
  
  ADMIN: {
    name: 'Admin',
    slug: 'admin',
    permissions: [
      'user.*',
      'role.*',
      'campaign.*',
      'lead.*',
      'platform.*',
      'workflow.*',
      'analytics.*',
      'admin.dashboard',
      'admin.audit',
    ],
    featureAccess: { '*': true },
    platformAccess: ['*'],
    priority: 90,
    isSystem: true,
  },
  
  MANAGER: {
    name: 'Manager',
    slug: 'manager',
    permissions: [
      'user.read',
      'campaign.*',
      'lead.*',
      'platform.read',
      'platform.post',
      'workflow.*',
      'analytics.read',
    ],
    featureAccess: {
      campaigns: true,
      leads: true,
      platforms: true,
      workflows: true,
      analytics: true,
    },
    platformAccess: ['*'],
    priority: 50,
    isSystem: true,
  },
  
  USER: {
    name: 'User',
    slug: 'user',
    permissions: [
      'campaign.read',
      'campaign.create',
      'lead.read',
      'lead.create',
      'platform.read',
      'platform.post',
      'workflow.read',
      'workflow.execute',
    ],
    featureAccess: {
      campaigns: true,
      leads: true,
      platforms: true,
      workflows: true,
    },
    platformAccess: ['*'],
    priority: 10,
    isSystem: true,
  },
  
  VIEWER: {
    name: 'Viewer',
    slug: 'viewer',
    permissions: [
      'campaign.read',
      'lead.read',
      'platform.read',
      'workflow.read',
      'analytics.read',
    ],
    featureAccess: {
      campaigns: false,
      leads: false,
      platforms: false,
      workflows: false,
      analytics: true,
    },
    platformAccess: [],
    priority: 1,
    isSystem: true,
  },
};
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Week 1: Backend Foundation
- [ ] Add database models to Prisma schema
- [ ] Run migrations
- [ ] Create admin module structure
- [ ] Implement UserManagementService
- [ ] Implement RoleManagementService
- [ ] Implement UsageTrackingService
- [ ] Add admin guards and decorators

### Week 2: Backend APIs + Testing
- [ ] Implement all admin API endpoints
- [ ] Add permission checking to all routes
- [ ] Implement session management
- [ ] Implement audit logging
- [ ] Write unit tests
- [ ] Write integration tests

### Week 3: Frontend Implementation
- [ ] Create admin page structure
- [ ] Implement admin dashboard
- [ ] Implement user management UI
- [ ] Implement role management UI
- [ ] Implement audit trail UI
- [ ] Add bulk operations
- [ ] Connect to backend APIs
- [ ] End-to-end testing

---

## 🎯 SUCCESS CRITERIA

✅ **Functional:**
- Admin can view all users
- Admin can suspend/enable users
- Admin can assign roles
- Admin can set usage limits
- Admin can view active sessions
- Admin can revoke sessions
- All admin actions are logged
- Bulk operations work for 100+ users

✅ **Performance:**
- User list loads in <1s (1000 users)
- Suspend operation completes in <2s
- Bulk operations handle 100 users in <10s

✅ **Security:**
- All admin operations require authentication
- Permission checks on every operation
- Audit trail captures everything
- Session revocation is immediate

✅ **UX:**
- Admin dashboard is intuitive
- Bulk operations are easy
- Audit trail is searchable
- Usage monitoring is clear

---

**Status:** ✅ DESIGN COMPLETE  
**Next Step:** Begin implementation (Week 1)  
**Estimated Completion:** 3 weeks  
**Date:** 2026-08-15
