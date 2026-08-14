# USAMKO v2.0 - HYBRID ARCHITECTURE SPECIFICATION (PART 2)

**Document Version:** 1.0  
**Date:** 2026-08-14  
**Continuation of:** ARCHITECTURE.md (Part 1)

---

## 9. AUTHENTICATION ARCHITECTURE

### 9.1 Four Authentication Domains

The system requires authentication across **four distinct domains**:

| Domain | Purpose | Method | Token Type |
|--------|---------|--------|------------|
| **User → Web App** | Users log into web interface | Email/Password or OAuth | JWT (access + refresh) |
| **Web App → API** | API requests from frontend | Bearer token | JWT from localStorage |
| **Node.js → .NET Services** | Internal service-to-service | Service credentials | Service JWT |
| **Extension → API** | Extension token relay | User JWT from localStorage | JWT (same as user) |

### 9.2 User Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: User Registration                                    │
│                                                              │
│ POST /auth/register                                          │
│ { email, password, name }                                    │
│   ↓                                                          │
│ 1. Validate email format                                     │
│ 2. Check email not already registered                        │
│ 3. Hash password with bcrypt (12 rounds)                     │
│ 4. Create User record                                        │
│ 5. Create Tenant record (if first user)                      │
│ 6. Send email verification link                              │
│ 7. Return success (without JWT - email must be verified)     │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Email Verification                                   │
│                                                              │
│ User clicks link → GET /auth/verify-email?token=...         │
│   ↓                                                          │
│ 1. Validate token (check expiry, signature)                 │
│ 2. Mark user.emailVerified = true                            │
│ 3. Delete EmailVerification record                           │
│ 4. Redirect to /login with success message                   │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 3: User Login                                           │
│                                                              │
│ POST /auth/login                                             │
│ { email, password }                                          │
│   ↓                                                          │
│ 1. Find user by email                                        │
│ 2. Check emailVerified === true                              │
│ 3. Compare password with bcrypt                              │
│ 4. Check account not locked (failedLoginAttempts < 5)        │
│ 5. Check 2FA if enabled (request TOTP code)                  │
│ 6. Generate JWT access token (15 min expiry)                 │
│ 7. Generate JWT refresh token (7 day expiry)                 │
│ 8. Store refresh token in database                           │
│ 9. Update lastLoginAt, lastLoginIp                           │
│ 10. Return { accessToken, refreshToken, user }               │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Token Storage (Frontend)                             │
│                                                              │
│ localStorage.setItem('accessToken', jwt.accessToken)         │
│ localStorage.setItem('refreshToken', jwt.refreshToken)       │
│ localStorage.setItem('user', JSON.stringify(user))           │
│                                                              │
│ Every API request:                                           │
│ headers: { Authorization: `Bearer ${accessToken}` }         │
└──────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Token Refresh                                        │
│                                                              │
│ When accessToken expires (401 response):                     │
│ POST /auth/refresh                                           │
│ { refreshToken }                                             │
│   ↓                                                          │
│ 1. Validate refresh token signature                          │
│ 2. Check token exists in database (not revoked)              │
│ 3. Check token not expired                                   │
│ 4. Generate new access token                                 │
│ 5. Optionally rotate refresh token                           │
│ 6. Return { accessToken, refreshToken }                      │
│                                                              │
│ Frontend retries original request with new token             │
└──────────────────────────────────────────────────────────────┘
```

### 9.3 JWT Payload Structure

**Access Token Payload:**
```json
{
  "sub": "user_abc123",           // User ID
  "email": "user@example.com",
  "tenantId": "tenant_xyz789",
  "role": "USER",                  // ADMIN | USER | VIEWER
  "permissions": ["campaigns:write", "platforms:read"],
  "iat": 1692012000,               // Issued at
  "exp": 1692012900                // Expires (15 min)
}
```

**Refresh Token Payload:**
```json
{
  "sub": "user_abc123",
  "tokenId": "refresh_token_456",  // For revocation lookup
  "iat": 1692012000,
  "exp": 1692616800                // Expires (7 days)
}
```

### 9.4 Service-to-Service Authentication (Node.js ↔ .NET)

**Challenge:** Node.js needs to authenticate to .NET gRPC services

**Solution: Service JWT with Shared Secret**

```
┌─────────────────────────────────────────────────────────────┐
│ Node.js API Server                                           │
│                                                              │
│ Environment Variable:                                        │
│ SERVICE_JWT_SECRET=<shared-secret-256-bit>                   │
│                                                              │
│ When calling .NET service:                                   │
│ const serviceToken = jwt.sign({                              │
│   sub: 'nodejs-api',                                         │
│   service: true,                                             │
│   iat: Date.now()                                            │
│ }, process.env.SERVICE_JWT_SECRET, {                         │
│   expiresIn: '5m'  // Short-lived                            │
│ });                                                          │
│                                                              │
│ grpcClient.metadata.add('authorization', `Bearer ${serviceToken}`);│
└──────────────────────────────────────────────────────────────┘
                         │
                         │ gRPC call with metadata
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ .NET gRPC Service                                            │
│                                                              │
│ Environment Variable:                                        │
│ SERVICE_JWT_SECRET=<same-shared-secret>                      │
│                                                              │
│ [Authorize]                                                  │
│ public override async Task<Response> Method(...) {           │
│   // JWT middleware validates token before reaching here    │
│   // If invalid, returns gRPC UNAUTHENTICATED status         │
│   ...                                                        │
│ }                                                            │
│                                                              │
│ Middleware validates:                                        │
│ 1. Signature matches SERVICE_JWT_SECRET                      │
│ 2. Token not expired                                         │
│ 3. Payload.service === true                                  │
└──────────────────────────────────────────────────────────────┘
```

**Security Considerations:**
- Service JWT secret MUST be different from user JWT secret
- Rotate service secret quarterly
- Never expose service secret to frontend
- Use mTLS in production (gRPC SSL)

### 9.5 Extension Authentication

**Challenge:** Extension needs to authenticate to backend

**Solution: Inherit User JWT**

```
┌─────────────────────────────────────────────────────────────┐
│ User logs into Web App                                       │
│ localStorage.setItem('accessToken', jwt)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Chrome Extension Background Script                           │
│ chromeExt/background.js                                      │
│                                                              │
│ // Read JWT from Web App's localStorage                     │
│ chrome.storage.local.get(['accessToken'], (result) => {     │
│   const jwt = result.accessToken;                           │
│                                                              │
│   // Connect WebSocket with JWT                             │
│   const ws = new WebSocket('wss://api.usamko.com/extension', {│
│     headers: {                                               │
│       Authorization: `Bearer ${jwt}`                         │
│     }                                                        │
│   });                                                        │
│                                                              │
│   ws.on('open', () => {                                      │
│     console.log('Extension authenticated');                 │
│   });                                                        │
│ });                                                          │
└──────────────────────────────────────────────────────────────┘
                         │
                         │ WebSocket handshake
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ Node.js WebSocket Gateway                                    │
│ apps/api/src/extension/extension.gateway.ts                 │
│                                                              │
│ @WebSocketGateway({ namespace: '/extension' })              │
│ export class ExtensionGateway {                              │
│   handleConnection(client: Socket) {                         │
│     const token = client.handshake.headers.authorization     │
│                   ?.replace('Bearer ', '');                  │
│                                                              │
│     if (!token) {                                            │
│       client.disconnect();                                   │
│       return;                                                │
│     }                                                        │
│                                                              │
│     try {                                                    │
│       const payload = this.jwtService.verify(token);        │
│       client.data.userId = payload.sub;                      │
│       client.data.tenantId = payload.tenantId;               │
│       client.emit('authenticated', { success: true });       │
│     } catch (error) {                                        │
│       client.disconnect();                                   │
│     }                                                        │
│   }                                                          │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘
```

### 9.6 Platform Authentication (OAuth)

**Challenge:** Users need to connect Facebook/Twitter/Instagram accounts

**Solution: Standard OAuth 2.0 Flow**

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: User clicks "Connect Facebook"                       │
│ Frontend redirects to: /auth/facebook                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Node.js OAuth Controller                             │
│                                                              │
│ @Get('/facebook')                                            │
│ @UseGuards(JwtAuthGuard)                                     │
│ facebookAuth(@Req() req) {                                   │
│   // Store user ID in session for callback                   │
│   req.session.userId = req.user.id;                          │
│   req.session.tenantId = req.user.tenantId;                  │
│   // Passport will redirect to Facebook                      │
│ }                                                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Facebook OAuth Dialog                                │
│ https://www.facebook.com/v18.0/dialog/oauth                  │
│ ?client_id=YOUR_APP_ID                                       │
│ &redirect_uri=https://yourdomain.com/auth/facebook/callback │
│ &scope=pages_manage_posts,pages_read_engagement             │
│                                                              │
│ User approves → Facebook redirects with code                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: OAuth Callback                                       │
│ GET /auth/facebook/callback?code=...                         │
│                                                              │
│ @Get('/facebook/callback')                                   │
│ async facebookCallback(@Query('code') code, @Session() session) {│
│   // Exchange code for access token                          │
│   const { accessToken, refreshToken, expiresIn } =          │
│     await this.facebookStrategy.exchangeCode(code);          │
│                                                              │
│   // Get user info from Facebook                             │
│   const fbUser = await this.facebookAPI.getMe(accessToken); │
│                                                              │
│   // CRITICAL: Encrypt tokens before storing                 │
│   const encryptedAccessToken = await this.encryptionService  │
│     .encrypt(accessToken, session.tenantId);                 │
│   const encryptedRefreshToken = await this.encryptionService│
│     .encrypt(refreshToken, session.tenantId);                │
│                                                              │
│   // Store in database                                       │
│   await this.prisma.platformAccount.create({                 │
│     data: {                                                   │
│       tenantId: session.tenantId,                             │
│       userId: session.userId,                                 │
│       platform: 'FACEBOOK',                                   │
│       accountId: fbUser.id,                                   │
│       username: fbUser.username,                              │
│       displayName: fbUser.name,                               │
│       accessToken: encryptedAccessToken,                      │
│       refreshToken: encryptedRefreshToken,                    │
│       expiresAt: new Date(Date.now() + expiresIn * 1000),   │
│       status: 'CONNECTED'                                     │
│     }                                                         │
│   });                                                         │
│                                                              │
│   // Redirect to success page                                │
│   return res.redirect('/platforms?success=facebook');        │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘
```

### 9.7 Two-Factor Authentication (2FA)

**Status:** Currently in .NET only, needs migration to Node.js

**Implementation Plan:**

```typescript
// apps/api/src/auth/two-factor.service.ts
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorService {
  async generateSecret(userId: string, email: string) {
    const secret = speakeasy.generateSecret({
      name: `USAMKO (${email})`,
      issuer: 'USAMKO'
    });

    // Store secret in database (encrypted)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: await this.encrypt(secret.base32),
        twoFactorEnabled: false  // Not enabled until verified
      }
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl
    };
  }

  async verifyToken(userId: string, token: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true }
    });

    const secret = await this.decrypt(user.twoFactorSecret);

    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2  // Allow 2 time steps before/after
    });
  }

  async enableTwoFactor(userId: string, verificationToken: string) {
    const isValid = await this.verifyToken(userId, verificationToken);
    
    if (!isValid) {
      throw new UnauthorizedException('Invalid 2FA token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true }
    });
  }
}
```

**Modified Login Flow with 2FA:**
1. User enters email/password
2. Backend validates credentials
3. If `user.twoFactorEnabled === true`, return `{ requires2FA: true }`
4. Frontend prompts for 6-digit code
5. User submits code
6. Backend verifies code with `TwoFactorService.verifyToken()`
7. If valid, issue JWT tokens

---

## 10. SECURITY ARCHITECTURE

### 10.1 Encryption Service (Node.js Implementation)

**Priority: CRITICAL - Must be implemented in Phase 1**

```typescript
// apps/api/src/security/encryption.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly masterKey: Buffer;

  constructor(private config: ConfigService) {
    // Master key from environment (32 bytes hex)
    const masterKeyHex = this.config.get<string>('ENCRYPTION_MASTER_KEY');
    if (!masterKeyHex || masterKeyHex.length !== 64) {
      throw new Error('ENCRYPTION_MASTER_KEY must be 64 hex characters (32 bytes)');
    }
    this.masterKey = Buffer.from(masterKeyHex, 'hex');
  }

  /**
   * Derive tenant-specific encryption key
   */
  private deriveTenantKey(tenantId: string): Buffer {
    return crypto
      .createHmac('sha256', this.masterKey)
      .update(tenantId)
      .digest();
  }

  /**
   * Encrypt plaintext for a specific tenant
   */
  async encrypt(plaintext: string, tenantId: string): Promise<EncryptedData> {
    const key = this.deriveTenantKey(tenantId);
    const iv = crypto.randomBytes(16);  // Initialization vector
    
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();  // For GCM mode integrity check

    return {
      ciphertext,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }

  /**
   * Decrypt ciphertext for a specific tenant
   */
  async decrypt(encrypted: EncryptedData, tenantId: string): Promise<string> {
    const key = this.deriveTenantKey(tenantId);
    const iv = Buffer.from(encrypted.iv, 'hex');
    const authTag = Buffer.from(encrypted.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  }

  /**
   * Encrypt OAuth token before database storage
   */
  async encryptToken(token: string, tenantId: string): Promise<string> {
    const encrypted = await this.encrypt(token, tenantId);
    // Store as JSON string for Prisma
    return JSON.stringify(encrypted);
  }

  /**
   * Decrypt OAuth token after database retrieval
   */
  async decryptToken(encryptedJson: string, tenantId: string): Promise<string> {
    const encrypted = JSON.parse(encryptedJson) as EncryptedData;
    return this.decrypt(encrypted, tenantId);
  }
}

interface EncryptedData {
  ciphertext: string;
  iv: string;
  authTag: string;
}
```

### 10.2 Credential Vault (Node.js Implementation)

**Status:** Currently .NET only, needs migration

**Strategy:** Store encrypted credentials in PostgreSQL (not separate file like .NET)

```typescript
// apps/api/src/security/credential-vault.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from './encryption.service';

@Injectable()
export class CredentialVaultService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService
  ) {}

  /**
   * Store encrypted credential
   */
  async storeCredential(
    key: string,
    value: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    const encrypted = await this.encryption.encryptToken(value, tenantId);

    await this.prisma.credentialVault.upsert({
      where: {
        tenantId_userId_key: {
          tenantId,
          userId,
          key
        }
      },
      create: {
        tenantId,
        userId,
        key,
        value: encrypted,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        value: encrypted,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Retrieve decrypted credential
   */
  async getCredential(
    key: string,
    tenantId: string,
    userId: string
  ): Promise<string | null> {
    const record = await this.prisma.credentialVault.findUnique({
      where: {
        tenantId_userId_key: {
          tenantId,
          userId,
          key
        }
      }
    });

    if (!record) return null;

    return this.encryption.decryptToken(record.value, tenantId);
  }

  /**
   * Delete credential
   */
  async deleteCredential(
    key: string,
    tenantId: string,
    userId: string
  ): Promise<void> {
    await this.prisma.credentialVault.delete({
      where: {
        tenantId_userId_key: {
          tenantId,
          userId,
          key
        }
      }
    });
  }

  /**
   * List all credential keys (not values) for a user
   */
  async listKeys(tenantId: string, userId: string): Promise<string[]> {
    const records = await this.prisma.credentialVault.findMany({
      where: { tenantId, userId },
      select: { key: true }
    });

    return records.map(r => r.key);
  }
}
```

**New Prisma Model:**
```prisma
model CredentialVault {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  key       String   // e.g., "facebook_token", "api_key"
  value     String   @db.Text // Encrypted JSON
  createdAt DateTime
  updatedAt DateTime

  tenant    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tenantId, userId, key], name: "tenantId_userId_key")
  @@index([tenantId])
  @@index([userId])
}
```

### 10.3 Updated PlatformAccount with Encryption

**Current Problem:** Tokens stored in plain text

**Solution:** Encrypt on write, decrypt on read

```typescript
// apps/api/src/platforms/platform.service.ts

@Injectable()
export class PlatformService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService
  ) {}

  /**
   * Connect platform account (OAuth callback)
   */
  async connectAccount(
    platform: Platform,
    accountData: OAuthAccountData,
    tenantId: string,
    userId: string
  ): Promise<PlatformAccount> {
    // Encrypt tokens
    const encryptedAccessToken = await this.encryption.encryptToken(
      accountData.accessToken,
      tenantId
    );
    
    const encryptedRefreshToken = accountData.refreshToken
      ? await this.encryption.encryptToken(accountData.refreshToken, tenantId)
      : null;

    return this.prisma.platformAccount.create({
      data: {
        tenantId,
        userId,
        platform,
        accountId: accountData.accountId,
        username: accountData.username,
        displayName: accountData.displayName,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: accountData.expiresAt,
        status: 'CONNECTED'
      }
    });
  }

  /**
   * Get decrypted access token for API calls
   */
  async getAccessToken(accountId: string, tenantId: string): Promise<string> {
    const account = await this.prisma.platformAccount.findUnique({
      where: { id: accountId }
    });

    if (!account) {
      throw new NotFoundException('Platform account not found');
    }

    if (account.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    // Decrypt token
    return this.encryption.decryptToken(account.accessToken, tenantId);
  }

  /**
   * Refresh token and re-encrypt
   */
  async refreshToken(accountId: string, tenantId: string): Promise<void> {
    const account = await this.prisma.platformAccount.findUnique({
      where: { id: accountId }
    });

    // Decrypt current refresh token
    const refreshToken = await this.encryption.decryptToken(
      account.refreshToken,
      tenantId
    );

    // Call platform API to refresh
    const adapter = this.getAdapter(account.platform);
    const newTokens = await adapter.refreshAccessToken(refreshToken);

    // Encrypt new tokens
    const encryptedAccessToken = await this.encryption.encryptToken(
      newTokens.accessToken,
      tenantId
    );
    const encryptedRefreshToken = await this.encryption.encryptToken(
      newTokens.refreshToken,
      tenantId
    );

    // Update database
    await this.prisma.platformAccount.update({
      where: { id: accountId },
      data: {
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt: newTokens.expiresAt
      }
    });
  }
}
```

### 10.4 Multi-Tenant Isolation Enforcement

**Prisma Middleware for Automatic Tenant Filtering:**

```typescript
// apps/api/src/prisma.service.ts

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();

    // Middleware: Enforce tenant isolation
    this.$use(async (params, next) => {
      // Get tenant ID from async context (set by request guard)
      const tenantId = this.cls.get('tenantId');

      if (!tenantId) {
        // Service-to-service calls may not have tenantId
        return next(params);
      }

      // Models with tenantId field
      const tenantModels = [
        'User',
        'PlatformAccount',
        'Campaign',
        'CampaignExecution',
        'Workflow',
        'WorkflowExecution',
        'ContentItem',
        'PromptTemplate',
        'CredentialVault',
        'Notification',
        'ApiKey',
        'TeamMember',
        'MediaFile'
      ];

      if (tenantModels.includes(params.model)) {
        // Read operations: Filter by tenantId
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          params.args.where = {
            ...params.args.where,
            tenantId
          };
        }

        if (params.action === 'findMany') {
          if (!params.args) params.args = {};
          params.args.where = {
            ...params.args.where,
            tenantId
          };
        }

        // Write operations: Inject tenantId
        if (params.action === 'create') {
          params.args.data = {
            ...params.args.data,
            tenantId
          };
        }

        if (params.action === 'createMany') {
          if (Array.isArray(params.args.data)) {
            params.args.data = params.args.data.map(item => ({
              ...item,
              tenantId
            }));
          }
        }

        // Update/Delete: Enforce tenantId in where clause
        if (params.action === 'update' || params.action === 'delete') {
          params.args.where = {
            ...params.args.where,
            tenantId
          };
        }

        if (params.action === 'updateMany' || params.action === 'deleteMany') {
          if (!params.args) params.args = {};
          params.args.where = {
            ...params.args.where,
            tenantId
          };
        }
      }

      return next(params);
    });
  }
}
```

### 10.5 Audit Logging

**Purpose:** Track all mutations for compliance and debugging

```typescript
// apps/api/src/audit/audit.interceptor.ts

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private auditService: AuditService,
    private cls: ClsService
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, user } = request;

    // Only audit write operations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const before = Date.now();

    return next.handle().pipe(
      tap({
        next: (response) => {
          const duration = Date.now() - before;
          
          // Async fire-and-forget audit log
          this.auditService.log({
            userId: user?.id,
            tenantId: user?.tenantId,
            action: `${method} ${url}`,
            entity: this.extractEntity(url),
            entityId: this.extractEntityId(url, response),
            changes: this.sanitize(body),  // Remove sensitive fields
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            success: true,
            duration,
            timestamp: new Date()
          });
        },
        error: (error) => {
          this.auditService.log({
            userId: user?.id,
            tenantId: user?.tenantId,
            action: `${method} ${url}`,
            entity: this.extractEntity(url),
            changes: this.sanitize(body),
            error: error.message,
            success: false,
            timestamp: new Date()
          });
        }
      })
    );
  }

  private sanitize(data: any): any {
    if (!data) return data;
    
    const sensitive = ['password', 'accessToken', 'refreshToken', 'secret', 'apiKey'];
    const sanitized = { ...data };
    
    for (const key of sensitive) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }
}
```

**Prisma Model:**
```prisma
model AuditLog {
  id        String   @id @default(cuid())
  tenantId  String?
  userId    String?
  action    String   // "POST /campaigns"
  entity    String?  // "Campaign"
  entityId  String?  // "campaign_123"
  changes   Json?    // { name: "New Campaign", ... }
  error     String?  // Error message if failed
  success   Boolean  @default(true)
  ipAddress String?
  userAgent String?
  duration  Int?     // Milliseconds
  timestamp DateTime @default(now())

  @@index([tenantId])
  @@index([userId])
  @@index([timestamp])
  @@index([entity, entityId])
}
```

### 10.6 Security Checklist

| Security Control | Status | Priority |
|------------------|--------|----------|
| **Password hashing (bcrypt 12 rounds)** | 🔨 Build | HIGH |
| **JWT token expiry (15 min access, 7 day refresh)** | ✅ Ready | HIGH |
| **Refresh token rotation** | 🔨 Build | MEDIUM |
| **Token revocation on logout** | 🔨 Build | HIGH |
| **OAuth token encryption at rest** | 🔨 Build | **CRITICAL** |
| **Credential vault** | 🔨 Build | **CRITICAL** |
| **Multi-tenant isolation (Prisma middleware)** | 🔨 Build | **CRITICAL** |
| **Audit logging** | 🔨 Build | HIGH |
| **Rate limiting (ThrottlerModule)** | ✅ Ready | HIGH |
| **CORS configuration** | 🔨 Configure | HIGH |
| **Helmet.js security headers** | ✅ Ready | HIGH |
| **SQL injection prevention (Prisma ORM)** | ✅ Ready | HIGH |
| **XSS prevention (React escaping)** | ✅ Ready | HIGH |
| **CSRF protection** | 🔨 Build | MEDIUM |
| **Service-to-service JWT** | 🔨 Build | HIGH |
| **Extension WebSocket auth** | 🔨 Build | HIGH |
| **gRPC mTLS (production)** | 🔨 Configure | HIGH |
| **Secrets management (AWS Secrets Manager)** | 🔨 Configure | HIGH |
| **2FA (TOTP)** | 🔨 Build | MEDIUM |
| **Account lockout (5 failed attempts)** | 🔨 Build | MEDIUM |
| **Session timeout** | ✅ Ready | LOW |
| **Input validation (class-validator)** | ✅ Ready | HIGH |

---

## 11. MIGRATION PLAN

### 11.1 Migration Phases Overview

| Phase | Duration | Goal | Risk |
|-------|----------|------|------|
| **Phase 1** | Week 1-2 | Secure foundation + Hybrid deploy | MEDIUM |
| **Phase 2** | Week 3-6 | Platform feature parity | LOW |
| **Phase 3** | Week 7-10 | AI parity (Claude, orchestration) | MEDIUM |
| **Phase 4** | Week 11-18 | Workflow engine migration | HIGH |
| **Phase 5** | Week 19-26 | Plugin system migration | HIGH |
| **Phase 6** | Week 27-32 | Content library, templates, 2FA | LOW |
| **Phase 7** | Week 33-36 | Full regression testing | MEDIUM |
| **Phase 8** | Week 37-40 | Performance optimization | LOW |
| **Phase 9** | Week 41+ | .NET deprecation (only after 100% parity) | LOW |

### 11.2 Phase 1: Secure Foundation + Hybrid Deploy (Week 1-2)

**Goal:** Deploy working hybrid system with encryption

**Tasks:**

| Task | Owner | Duration | Dependencies |
|------|-------|----------|--------------|
| **1.1 Implement EncryptionService** | Backend | 1 day | None |
| **1.2 Implement CredentialVaultService** | Backend | 1 day | 1.1 |
| **1.3 Add CredentialVault Prisma model** | Backend | 2 hours | None |
| **1.4 Update PlatformAccount with encryption** | Backend | 1 day | 1.1 |
| **1.5 Migrate existing tokens (encrypt plain text)** | Backend | 4 hours | 1.4 |
| **1.6 Create .NET gRPC services** | .NET | 2 days | None |
| **1.7 Create gRPC proto files** | Both | 4 hours | None |
| **1.8 Implement Node.js gRPC clients** | Backend | 1 day | 1.6, 1.7 |
| **1.9 Implement FeatureRouter** | Backend | 1 day | None |
| **1.10 Build Extension WebSocket Gateway** | Backend | 2 days | None |
| **1.11 Update Extension with WebSocket** | Extension | 2 days | 1.10 |
| **1.12 Extension UI (popup, status)** | Extension | 1 day | 1.11 |
| **1.13 Web App extension integration UI** | Frontend | 2 days | None |
| **1.14 Prisma middleware (tenant isolation)** | Backend | 1 day | None |
| **1.15 Audit logging** | Backend | 1 day | None |
| **1.16 Service JWT authentication** | Both | 1 day | 1.6 |
| **1.17 Deploy to EC2** | DevOps | 2 days | All above |
| **1.18 End-to-end testing** | QA | 2 days | 1.17 |

**Deliverables:**
- ✅ Encryption service operational
- ✅ All platform tokens encrypted
- ✅ .NET services running as gRPC servers
- ✅ Node.js routes to .NET for missing features
- ✅ Extension captures and relays tokens securely
- ✅ Web app deployed and accessible
- ✅ Multi-tenant isolation enforced
- ✅ Audit logs recording all mutations

**Success Criteria:**
- User can log in via web app
- User can connect Facebook via OAuth (token encrypted)
- User can install extension and see "Connected" status
- Extension captures Facebook tokens and sends to backend
- User can create and start a campaign
- Campaign executes (routes to Node.js or .NET as appropriate)
- No credentials stored in plain text

---

### 11.3 Phase 2: Platform Feature Parity (Week 3-6)

**Goal:** Migrate platform comments, messages, analytics from .NET to Node.js

**Tasks:**

| Task | Duration |
|------|----------|
| **2.1 Facebook Comments API** | 2 days |
| - getComments(postId) | 4 hours |
| - replyToComment(commentId, text) | 4 hours |
| - Test parity with .NET implementation | 4 hours |
| **2.2 Facebook Messaging API** | 3 days |
| - getMessages(conversationId) | 4 hours |
| - sendMessage(userId, text) | 4 hours |
| - sendMediaMessage(userId, mediaUrl) | 4 hours |
| - Test parity | 4 hours |
| **2.3 Facebook Analytics API** | 2 days |
| - getPostAnalytics(postId) → {likes, comments, shares, reach} | 6 hours |
| - Test parity | 2 hours |
| **2.4 Instagram Comments API** | 2 days |
| **2.5 Instagram Analytics API** | 2 days |
| **2.6 Twitter Analytics API** | 2 days |
| **2.7 Regression Testing** | 3 days |
| - Compare Node.js vs .NET outputs | 1 day |
| - Test edge cases | 1 day |
| - Performance testing | 1 day |
| **2.8 Update FeatureRouter** | 1 day |
| - Mark platform.facebook.comments as NODE_JS_READY | 1 hour |
| - Mark platform.facebook.messages as NODE_JS_READY | 1 hour |
| - Mark platform.facebook.analytics as NODE_JS_READY | 1 hour |
| - Same for Instagram, Twitter | 4 hours |
| **2.9 Documentation** | 1 day |

**Deliverables:**
- ✅ Platform comments work in Node.js (parity with .NET)
- ✅ Platform messaging works in Node.js
- ✅ Platform analytics works in Node.js
- ✅ FeatureRouter routes platform features to Node.js
- ✅ .NET platform service can be retired (but keep running)

---

### 11.4 Phase 3: AI Parity (Week 7-10)

**Goal:** Add Claude AI + AI orchestration to Node.js

**Tasks:**

| Task | Duration |
|------|----------|
| **3.1 Install Anthropic SDK** | 1 hour |
| **3.2 Create ClaudeProvider class** | 1 day |
| - generateContent() | 4 hours |
| - generateImage() [if Claude supports] | 2 hours |
| - translate() | 2 hours |
| **3.3 Create AIOrchestrator service** | 2 days |
| - Provider registry (OpenAI, Claude) | 4 hours |
| - Failover logic (try primary → fallback) | 6 hours |
| - Provider health tracking | 2 hours |
| **3.4 Update AIService to use orchestrator** | 1 day |
| **3.5 Add provider selection UI** | 1 day |
| - Dropdown: OpenAI / Claude / Auto | 4 hours |
| - Show which provider was used in response | 2 hours |
| **3.6 Test failover behavior** | 2 days |
| - Simulate OpenAI outage → should use Claude | 4 hours |
| - Simulate rate limit → should switch provider | 4 hours |
| - Test concurrent requests | 4 hours |
| **3.7 Update FeatureRouter** | 1 hour |
| - Mark ai.generate.claude as NODE_JS_READY | |
| - Mark ai.orchestration as NODE_JS_READY | |
| **3.8 Regression testing** | 2 days |
| - Compare content quality OpenAI vs Claude | 1 day |
| - Performance testing | 1 day |
| **3.9 Documentation** | 1 day |

**Note:** Local LLM support NOT migrated (incompatible with cloud deployment)

**Deliverables:**
- ✅ Claude AI integration works
- ✅ AI orchestration with automatic failover
- ✅ Users can choose provider or use "Auto"
- ✅ FeatureRouter routes AI features to Node.js
- ✅ .NET AI service can be retired (but keep for failover)

---

### 11.5 Phase 4: Workflow Engine (Week 11-18)

**Goal:** Port full workflow engine from .NET to Node.js

**THIS IS THE MOST COMPLEX MIGRATION**

**Tasks:**

| Task | Duration |
|------|----------|
| **4.1 Design Node.js workflow architecture** | 2 days |
| - Review .NET WorkflowEngine.cs (463 lines) | 1 day |
| - Design equivalent TypeScript classes | 1 day |
| **4.2 Implement workflow step types** | 5 days |
| - DelayStep | 4 hours |
| - PostStep | 6 hours |
| - AIGenerateStep | 6 hours |
| - ConditionStep (if/then/else) | 8 hours |
| - LoopStep | 8 hours |
| - BrowserActionStep | 8 hours |
| **4.3 Implement variable substitution** | 2 days |
| - Parse {{variable}} syntax | 4 hours |
| - Resolve variables from context | 6 hours |
| - Support nested variables | 4 hours |
| **4.4 Implement WorkflowContext** | 1 day |
| - Shared state across steps | 4 hours |
| - Variable storage/retrieval | 4 hours |
| **4.5 Implement conditional execution** | 2 days |
| - Evaluate conditions (equals, greaterThan, etc.) | 6 hours |
| - Branch execution (if/then/else) | 6 hours |
| **4.6 Implement parallel execution** | 2 days |
| - Execute multiple steps concurrently | 8 hours |
| - Wait for all to complete | 4 hours |
| **4.7 Implement error recovery** | 2 days |
| - Try/catch per step | 4 hours |
| - Retry logic (exponential backoff) | 6 hours |
| - Error logging with stack trace | 2 hours |
| **4.8 Implement execution logging** | 1 day |
| - Log each step start/complete/fail | 4 hours |
| - Store logs in WorkflowExecution | 4 hours |
| **4.9 Update WorkflowService** | 2 days |
| - executeWorkflow() uses new engine | 8 hours |
| - Stream execution events via WebSocket | 4 hours |
| **4.10 Frontend workflow builder enhancements** | 3 days |
| - Support all step types in UI | 1 day |
| - Condition builder UI | 1 day |
| - Loop configuration UI | 1 day |
| **4.11 Comprehensive testing** | 5 days |
| - Unit tests for each step type | 2 days |
| - Integration tests for full workflows | 2 days |
| - Regression tests (Node.js vs .NET) | 1 day |
| **4.12 Performance optimization** | 2 days |
| - Profile execution time | 1 day |
| - Optimize database queries | 1 day |
| **4.13 Update FeatureRouter** | 1 hour |
| - Mark workflow.execute as NODE_JS_READY | |
| - Mark workflow.conditional as NODE_JS_READY | |
| - Mark workflow.loop as NODE_JS_READY | |
| **4.14 Documentation** | 2 days |

**Deliverables:**
- ✅ Full workflow engine in Node.js
- ✅ All step types supported
- ✅ Conditional logic works
- ✅ Loops work
- ✅ Variable substitution works
- ✅ Parallel execution works
- ✅ Error recovery works
- ✅ Execution logs detailed
- ✅ Parity verified with .NET
- ✅ .NET workflow service can be retired

---

### 11.6 Phase 5: Plugin System (Week 19-26)

**Goal:** Build Node.js plugin architecture

**THIS IS ARCHITECTURAL - NO DIRECT PORT FROM .NET**

**Tasks:**

| Task | Duration |
|------|----------|
| **5.1 Design plugin architecture** | 3 days |
| - Research NestJS dynamic modules | 1 day |
| - Research npm package loading | 1 day |
| - Design plugin manifest schema | 1 day |
| **5.2 Create Plugin SDK** | 5 days |
| - IPlugin interface (TypeScript) | 1 day |
| - Plugin lifecycle hooks | 1 day |
| - Plugin context (service access) | 2 days |
| - Example plugin template | 1 day |
| **5.3 Implement PluginLoader** | 5 days |
| - Load plugins from directory | 2 days |
| - Validate plugin manifest | 1 day |
| - Initialize plugins at startup | 1 day |
| - Hot-reload support | 1 day |
| **5.4 Plugin isolation** | 3 days |
| - Separate module contexts | 2 days |
| - Error isolation (plugin crash ≠ app crash) | 1 day |
| **5.5 Plugin registry** | 2 days |
| - Register custom workflow steps | 1 day |
| - Register custom platform connectors | 1 day |
| **5.6 Plugin management API** | 3 days |
| - Install plugin | 1 day |
| - Uninstall plugin | 1 day |
| - List plugins | 1 day |
| **5.7 Plugin management UI** | 3 days |
| - Plugin marketplace page | 1 day |
| - Install/uninstall buttons | 1 day |
| - Plugin settings UI | 1 day |
| **5.8 Build sample plugins** | 5 days |
| - Sample platform connector plugin | 2 days |
| - Sample AI provider plugin | 2 days |
| - Sample workflow step plugin | 1 day |
| **5.9 Testing** | 3 days |
| **5.10 Documentation** | 2 days |
| - Plugin development guide | 1 day |
| - API reference | 1 day |

**Deliverables:**
- ✅ Plugin system works in Node.js
- ✅ Plugins can be loaded/unloaded
- ✅ Plugins can extend workflows
- ✅ Plugins can add platforms
- ✅ Plugin SDK documented
- ✅ .NET plugin system can be retired

---

### 11.7 Phase 6: Remaining Features (Week 27-32)

**Goal:** Migrate content library, prompt templates, 2FA, subscriptions

**Tasks:**

| Feature | Duration |
|---------|----------|
| **6.1 Content Library** | 5 days |
| - ContentItem Prisma model | 1 day |
| - CRUD API | 2 days |
| - Frontend library UI | 2 days |
| **6.2 Prompt Templates** | 4 days |
| - PromptTemplate Prisma model | 1 day |
| - CRUD API | 1 day |
| - Template selector UI | 2 days |
| **6.3 Two-Factor Authentication** | 5 days |
| - Generate secret + QR code | 1 day |
| - Verify TOTP token | 1 day |
| - Modify login flow | 2 days |
| - Frontend UI | 1 day |
| **6.4 Subscription Management** | 8 days |
| - Subscription Prisma model | 1 day |
| - Stripe integration | 3 days |
| - Usage tracking | 2 days |
| - Billing UI | 2 days |
| **6.5 User Lockout** | 2 days |
| - Track failed login attempts | 1 day |
| - Lock account after 5 failures | 1 day |
| **6.6 Browser Profile Persistence** | 3 days |
| - BrowserProfile Prisma model | 1 day |
| - Save/load profile logic | 2 days |
| **6.7 Testing** | 3 days |

**Deliverables:**
- ✅ Content library works
- ✅ Prompt templates work
- ✅ 2FA works
- ✅ Subscription management works
- ✅ User lockout works
- ✅ Browser profiles persist

---

### 11.8 Phase 7: Full Regression Testing (Week 33-36)

**Goal:** Verify 100% functional parity Node.js vs .NET

**Testing Matrix:**

| Feature Category | Tests | Duration |
|------------------|-------|----------|
| **Authentication** | 20 test cases | 2 days |
| **Platform Adapters** | 50 test cases × 5 platforms | 5 days |
| **AI Generation** | 30 test cases | 3 days |
| **Campaigns** | 40 test cases | 4 days |
| **Workflows** | 60 test cases | 6 days |
| **Browser Automation** | 30 test cases | 3 days |
| **Security** | 25 test cases | 2 days |
| **Multi-Tenancy** | 15 test cases | 1 day |
| **Extension** | 20 test cases | 2 days |

**Regression Test Process:**
1. Run same operation in .NET and Node.js
2. Compare outputs (JSON diff)
3. Compare error handling
4. Compare performance (response time)
5. Document any differences
6. Fix differences until outputs match

---

### 11.9 Phase 8: Performance Optimization (Week 37-40)

**Goal:** Ensure Node.js performs as well or better than .NET

**Tasks:**
- Database query optimization (N+1 queries, indexes)
- Redis caching for frequent queries
- Bull queue concurrency tuning
- gRPC connection pooling
- Frontend code splitting
- CDN configuration
- Load testing (100 concurrent users)
- Stress testing (1000 campaigns/hour)

---

### 11.10 Phase 9: .NET Deprecation (Week 41+)

**ONLY AFTER 100% PARITY VERIFIED**

**Gradual Deprecation Process:**

| Week | Task |
|------|------|
| Week 41 | Monitor Node.js in production (all traffic) |
| Week 42 | .NET services still running but idle |
| Week 43 | Analyze logs - confirm zero .NET service calls |
| Week 44 | Turn off .NET services (keep code in repo) |
| Week 45 | Monitor for any issues |
| Week 46 | Final confirmation - no regressions |
| Week 47+ | Archive .NET code (do NOT delete yet) |

**Success Criteria for Deprecation:**
- ✅ No FeatureRouter calls to .NET for 2 weeks
- ✅ All regression tests pass
- ✅ No user complaints about missing features
- ✅ Performance metrics acceptable
- ✅ Error rates same or lower than .NET
- ✅ Manual verification of ALL feature categories

---

## 12. REGRESSION TESTING STRATEGY

### 12.1 Testing Philosophy

**"Functional Parity, Not Just Code Parity"**

A feature is migrated only when:
1. Output matches .NET output (byte-for-byte if possible)
2. Error handling matches .NET behavior
3. Edge cases handled identically
4. Performance within 20% of .NET
5. Manual testing confirms user experience identical

### 12.2 Automated Regression Test Framework

```typescript
// apps/api/test/regression/regression-test.framework.ts

import { Test } from '@nestjs/testing';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as deepEqual from 'deep-equal';

const execAsync = promisify(exec);

interface TestCase {
  name: string;
  category: string;
  nodejsFunction: () => Promise<any>;
  dotnetCommand: string;  // CLI command to execute .NET version
  compareOutput: (nodejsResult: any, dotnetResult: any) => boolean;
  allowedDifferences?: string[];  // Fields allowed to differ (e.g., timestamps)
}

export class RegressionTestRunner {
  async runTest(testCase: TestCase): Promise<TestResult> {
    console.log(`Running: ${testCase.name}`);

    // Run Node.js version
    const nodejsStart = Date.now();
    let nodejsResult, nodejsError;
    try {
      nodejsResult = await testCase.nodejsFunction();
    } catch (error) {
      nodejsError = error;
    }
    const nodejsDuration = Date.now() - nodejsStart;

    // Run .NET version
    const dotnetStart = Date.now();
    let dotnetResult, dotnetError;
    try {
      const { stdout, stderr } = await execAsync(testCase.dotnetCommand);
      if (stderr) throw new Error(stderr);
      dotnetResult = JSON.parse(stdout);
    } catch (error) {
      dotnetError = error;
    }
    const dotnetDuration = Date.now() - dotnetStart;

    // Compare errors
    if (nodejsError && dotnetError) {
      const errorsMatch = nodejsError.message === dotnetError.message;
      return {
        name: testCase.name,
        passed: errorsMatch,
        nodejsResult: null,
        dotnetResult: null,
        nodejsError: nodejsError.message,
        dotnetError: dotnetError.message,
        nodejsDuration,
        dotnetDuration,
        differences: errorsMatch ? [] : ['Error messages differ']
      };
    }

    if (nodejsError || dotnetError) {
      return {
        name: testCase.name,
        passed: false,
        nodejsError: nodejsError?.message,
        dotnetError: dotnetError?.message,
        nodejsDuration,
        dotnetDuration,
        differences: ['One implementation errored, other succeeded']
      };
    }

    // Compare outputs
    const comparison = this.compareOutputs(
      nodejsResult,
      dotnetResult,
      testCase.allowedDifferences
    );

    return {
      name: testCase.name,
      passed: comparison.identical,
      nodejsResult,
      dotnetResult,
      nodejsDuration,
      dotnetDuration,
      differences: comparison.differences
    };
  }

  private compareOutputs(
    nodejsResult: any,
    dotnetResult: any,
    allowedDifferences: string[] = []
  ): ComparisonResult {
    // Remove allowed differences
    const cleanNodejs = this.removeFields(nodejsResult, allowedDifferences);
    const cleanDotnet = this.removeFields(dotnetResult, allowedDifferences);

    const identical = deepEqual(cleanNodejs, cleanDotnet);

    if (identical) {
      return { identical: true, differences: [] };
    }

    // Find differences
    const differences = this.findDifferences(cleanNodejs, cleanDotnet, '');

    return { identical: false, differences };
  }

  private findDifferences(obj1: any, obj2: any, path: string): string[] {
    const diffs: string[] = [];

    if (typeof obj1 !== typeof obj2) {
      diffs.push(`${path}: Type mismatch (${typeof obj1} vs ${typeof obj2})`);
      return diffs;
    }

    if (typeof obj1 !== 'object') {
      if (obj1 !== obj2) {
        diffs.push(`${path}: ${obj1} !== ${obj2}`);
      }
      return diffs;
    }

    const keys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of keys) {
      const newPath = path ? `${path}.${key}` : key;

      if (!(key in obj1)) {
        diffs.push(`${newPath}: Missing in Node.js`);
      } else if (!(key in obj2)) {
        diffs.push(`${newPath}: Missing in .NET`);
      } else {
        diffs.push(...this.findDifferences(obj1[key], obj2[key], newPath));
      }
    }

    return diffs;
  }

  private removeFields(obj: any, fields: string[]): any {
    if (!obj || typeof obj !== 'object') return obj;

    const cleaned = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (fields.includes(key)) continue;

      if (typeof obj[key] === 'object') {
        cleaned[key] = this.removeFields(obj[key], fields);
      } else {
        cleaned[key] = obj[key];
      }
    }

    return cleaned;
  }
}
```

### 12.3 Example Regression Tests

```typescript
// apps/api/test/regression/ai-generation.regression.spec.ts

describe('AI Generation Regression Tests', () => {
  const runner = new RegressionTestRunner();

  it('should generate identical content (OpenAI)', async () => {
    const testCase: TestCase = {
      name: 'AI Generate Post - OpenAI',
      category: 'AI',
      nodejsFunction: async () => {
        return aiService.generatePost({
          prompt: 'Summer sale announcement',
          platform: 'facebook',
          tone: 'exciting',
          provider: 'openai'
        });
      },
      dotnetCommand: 'dotnet run --project USAMKO.AI.CLI generate-post --prompt="Summer sale announcement" --platform=facebook --tone=exciting --provider=openai',
      compareOutput: (nodejs, dotnet) => {
        // Content may vary due to AI randomness, check structure
        return nodejs.content && dotnet.content &&
               nodejs.hashtags && dotnet.hashtags;
      },
      allowedDifferences: ['id', 'timestamp', 'content']  // AI output varies
    };

    const result = await runner.runTest(testCase);
    expect(result.passed).toBe(true);
  });

  it('should handle failover identically', async () => {
    // Simulate OpenAI outage
    process.env.OPENAI_API_KEY = 'invalid';

    const testCase: TestCase = {
      name: 'AI Failover - OpenAI → Claude',
      category: 'AI',
      nodejsFunction: async () => {
        return aiService.generatePost({
          prompt: 'Test prompt',
          provider: 'auto'  // Should failover
        });
      },
      dotnetCommand: 'dotnet run --project USAMKO.AI.CLI generate-post --prompt="Test prompt" --provider=auto',
      compareOutput: (nodejs, dotnet) => {
        return nodejs.providerUsed === 'claude' &&
               dotnet.providerUsed === 'claude' &&
               nodejs.failoverOccurred === true &&
               dotnet.failoverOccurred === true;
      }
    };

    const result = await runner.runTest(testCase);
    expect(result.passed).toBe(true);

    // Restore valid key
    process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY_BACKUP;
  });
});
```

### 12.4 Manual Testing Checklist

**For each migrated feature:**

| Test | Pass/Fail | Notes |
|------|-----------|-------|
| 1. Happy path (normal operation) | ☐ | |
| 2. Edge case: Empty input | ☐ | |
| 3. Edge case: Maximum input | ☐ | |
| 4. Edge case: Invalid input | ☐ | |
| 5. Error handling: Network failure | ☐ | |
| 6. Error handling: Rate limit | ☐ | |
| 7. Error handling: Invalid token | ☐ | |
| 8. Performance: Response time < 500ms | ☐ | |
| 9. Multi-tenancy: Cannot access other tenant's data | ☐ | |
| 10. Audit log: Mutation recorded | ☐ | |

---

## 13. DEPLOYMENT ARCHITECTURE

### 13.1 Production Deployment (AWS)

```
┌────────────────────────────────────────────────────────────────┐
│                         INTERNET                                │
└──────────────────────────┬─────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AWS ROUTE 53                                 │
│              DNS: usamko.com → ALB                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│             APPLICATION LOAD BALANCER (ALB)                      │
│          SSL Termination (ACM Certificate)                       │
│          Health Checks: /health                                  │
│          Rules:                                                  │
│          • /api/* → Target Group: API                            │
│          • /* → Target Group: Web                                │
└────────────────────┬────────────────────┬────────────────────────┘
                     │                    │
          ┌──────────┘                    └──────────┐
          ▼                                          ▼
┌───────────────────────────┐          ┌───────────────────────────┐
│   ECS SERVICE: API        │          │   ECS SERVICE: WEB        │
│   (NestJS Backend)        │          │   (Next.js Frontend)      │
│                           │          │                           │
│   Tasks: 3 (Auto Scaling) │          │   Tasks: 2 (Auto Scaling) │
│   CPU: 1 vCPU             │          │   CPU: 0.5 vCPU           │
│   Memory: 2 GB            │          │   Memory: 1 GB            │
│   Port: 3000              │          │   Port: 3001              │
│                           │          │                           │
│   Environment:            │          │   Environment:            │
│   • DATABASE_URL          │          │   • NEXT_PUBLIC_API_URL   │
│   • REDIS_URL             │          │   • NEXT_PUBLIC_WS_URL    │
│   • JWT_SECRET            │          │                           │
│   • ENCRYPTION_KEY        │          │                           │
│   • OPENAI_API_KEY        │          │                           │
└─────────────┬─────────────┘          └───────────────────────────┘
              │
              │ gRPC (internal only)
              ▼
┌───────────────────────────┐
│   ECS SERVICE: .NET       │
│   (gRPC Microservices)    │
│                           │
│   Tasks: 2 (Auto Scaling) │
│   CPU: 1 vCPU             │
│   Memory: 2 GB            │
│   Ports: 5001-5006        │
│                           │
│   Services:               │
│   • AI Service :5001      │
│   • Workflow :5002        │
│   • Security :5003        │
│   • Plugin :5004          │
│   • Content :5005         │
│   • Platform :5006        │
└─────────────┬─────────────┘
              │
        ┌─────┴─────┬──────────────┬──────────────┐
        ▼           ▼              ▼              ▼
┌──────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│ RDS          │ │ ElastiCache│ │    S3      │ │    SQS     │
│ PostgreSQL   │ │   Redis    │ │  Storage   │ │   Queues   │
│              │ │            │ │            │ │            │
│ Multi-AZ     │ │ 3 nodes    │ │ Versioned  │ │ campaign-  │
│ Encrypted    │ │ Cluster    │ │ Encrypted  │ │ executor   │
│ Automated    │ │            │ │ Lifecycle  │ │            │
│ Backups      │ │            │ │ Rules      │ │            │
└──────────────┘ └────────────┘ └────────────┘ └────────────┘
```

### 13.2 Infrastructure as Code (Terraform)

```hcl
# terraform/main.tf

# VPC
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support = true

  tags = {
    Name = "usamko-vpc"
    Environment = "production"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "usamko-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# ECS Task Definition: API
resource "aws_ecs_task_definition" "api" {
  family                   = "usamko-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "1024"
  memory                   = "2048"
  execution_role_arn       = aws_iam_role.ecs_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([{
    name  = "api"
    image = "${aws_ecr_repository.api.repository_url}:latest"
    portMappings = [{
      containerPort = 3000
      protocol      = "tcp"
    }]
    environment = [
      { name = "NODE_ENV", value = "production" },
      { name = "DATABASE_URL", value = "postgresql://..." },
      { name = "REDIS_URL", value = "redis://..." }
    ]
    secrets = [
      { name = "JWT_SECRET", valueFrom = "${aws_secretsmanager_secret.jwt_secret.arn}" },
      { name = "ENCRYPTION_MASTER_KEY", valueFrom = "${aws_secretsmanager_secret.encryption_key.arn}" }
    ]
    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = "/ecs/usamko-api"
        "awslogs-region"        = "us-east-1"
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

# ECS Service: API
resource "aws_ecs_service" "api" {
  name            = "usamko-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.private.*.id
    security_groups  = [aws_security_group.api.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 3000
  }

  depends_on = [aws_lb_listener.https]
}

# Auto Scaling
resource "aws_appautoscaling_target" "api" {
  max_capacity       = 10
  min_capacity       = 3
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "api_cpu" {
  name               = "api-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api.resource_id
  scalable_dimension = aws_appautoscaling_target.api.scalable_dimension
  service_namespace  = aws_appautoscaling_target.api.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}

# RDS PostgreSQL
resource "aws_db_instance" "postgres" {
  identifier             = "usamko-postgres"
  engine                 = "postgres"
  engine_version         = "16.1"
  instance_class         = "db.t3.large"
  allocated_storage      = 100
  storage_encrypted      = true
  multi_az               = true
  db_name                = "usamko"
  username               = "usamko_admin"
  password               = random_password.db_password.result
  backup_retention_period = 7
  backup_window          = "03:00-04:00"
  maintenance_window     = "mon:04:00-mon:05:00"
  skip_final_snapshot    = false
  final_snapshot_identifier = "usamko-final-snapshot"

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name

  tags = {
    Name = "usamko-postgres"
  }
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "usamko-redis"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = "cache.t3.medium"
  num_cache_nodes      = 3
  parameter_group_name = "default.redis7"
  port                 = 6379
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]

  tags = {
    Name = "usamko-redis"
  }
}

# S3 Bucket for Media Storage
resource "aws_s3_bucket" "media" {
  bucket = "usamko-media-production"

  tags = {
    Name = "usamko-media"
  }
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
```

### 13.3 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy-production.yml

name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy-api:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push API image to Amazon ECR
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          ECR_REPOSITORY: usamko-api
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG -f apps/api/Dockerfile .
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Update ECS service
        run: |
          aws ecs update-service --cluster usamko-cluster --service usamko-api --force-new-deployment

  build-and-deploy-web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build and push web image
        # Similar to API
      - name: Update ECS service
        run: |
          aws ecs update-service --cluster usamko-cluster --service usamko-web --force-new-deployment

  build-and-deploy-dotnet:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '8.0.x'
      - name: Build .NET services
        run: |
          dotnet publish src/USAMKO.AI.Service/USAMKO.AI.Service.csproj -c Release -o ./publish/ai-service
          dotnet publish src/USAMKO.Workflow.Service/USAMKO.Workflow.Service.csproj -c Release -o ./publish/workflow-service
      - name: Build and push Docker images
        # Build separate images for each .NET service
      - name: Update ECS services
        run: |
          aws ecs update-service --cluster usamko-cluster --service usamko-dotnet-ai --force-new-deployment
          aws ecs update-service --cluster usamko-cluster --service usamko-dotnet-workflow --force-new-deployment

  run-migrations:
    runs-on: ubuntu-latest
    needs: [build-and-deploy-api]
    steps:
      - uses: actions/checkout@v3
      - name: Run Prisma migrations
        run: |
          npm install
          npx prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}

  smoke-tests:
    runs-on: ubuntu-latest
    needs: [run-migrations]
    steps:
      - name: Health check API
        run: |
          curl -f https://api.usamko.com/health || exit 1
      - name: Health check Web
        run: |
          curl -f https://usamko.com || exit 1
```

---

## 14. FEATURE PRESERVATION MATRIX

[Full matrix with 80+ features showing Original Implementation → New Runtime → Status]

*(This section would be a comprehensive table - abbreviated for document length)*

Example rows:

| Feature | Original (.NET) | Original (Node.js) | New Runtime | Status | Test Status | Migration Required | Replacement Ready? |
|---------|----------------|-------------------|-------------|--------|-------------|-------------------|-------------------|
| User Registration | ⚠️ Basic | ✅ Full | Node.js | ✅ PRESERVED | ✅ Passed | None | Yes |
| OAuth Login | ⚠️ Basic | ✅ Full | Node.js | ✅ PRESERVED | ✅ Passed | None | Yes |
| 2FA | ✅ Full | ❌ Missing | .NET Service | ⚠️ PRESERVED VIA .NET | 🔨 Pending | Required | No |
| Claude AI | ✅ Full | ❌ Missing | .NET Service | ⚠️ PRESERVED VIA .NET | 🔨 Pending | Required | No |
| Local LLM | ✅ Full | ❌ Missing | .NET Service | ⚠️ PRESERVED VIA .NET | ⚠️ Cannot Migrate | **Cannot Migrate** | N/A |
| AI Orchestration | ✅ Full | ❌ Missing | .NET Service | ⚠️ PRESERVED VIA .NET | 🔨 Pending | Required | No |
| Workflow Engine | ✅ Full | ⚠️ Basic | .NET Service | ⚠️ PRESERVED VIA .NET | 🔨 Pending | Required | No |
| Plugin System | ✅ Full | ❌ Missing | .NET Service | ⚠️ PRESERVED VIA .NET | 🔨 Pending | Required | No |
| Credential Vault | ✅ Full | ❌ Missing | .NET Service | ⚠️ PRESERVED VIA .NET | 🔨 Pending | **CRITICAL** | No |
| Token Encryption | ✅ Full | ❌ Missing | .NET Service | ⚠️ PRESERVED VIA .NET | 🔨 Pending | **CRITICAL** | No |
| Facebook Post | ✅ Full | ✅ Full | Node.js | ✅ PRESERVED | ✅ Passed | None | Yes |
| Facebook Comments | ✅ Full | ❌ Missing | .NET Service | ⚠️ PRESERVED VIA .NET | 🔨 Pending | Required | No |
| Facebook Messages | ✅ Full | ❌ Missing | .NET Service | ⚠️ PRESERVED VIA .NET | 🔨 Pending | Required | No |
| Facebook Analytics | ✅ Full | ❌ Missing | .NET Service | ⚠️ PRESERVED VIA .NET | 🔨 Pending | Required | No |
| Browser Automation | ✅ Basic | ✅ Advanced | Node.js | ✅ PRESERVED | ✅ Passed | None | Yes |
| Extension Token Capture | ✅ Exists | ✅ Exists | Extension + Node.js | ✅ PRESERVED | 🔨 Pending | WebSocket Relay | No |

**Legend:**
- ✅ PRESERVED - Feature works in new architecture
- ⚠️ PRESERVED VIA .NET - Feature works via .NET service (not yet migrated)
- ❌ MISSING - Feature not implemented
- 🔨 Pending - Migration/testing in progress
- ✅ Passed - Regression tests passed
- ⚠️ Cannot Migrate - Feature cannot work in cloud (e.g., Local LLM)

---

## 15. SERVICE COMMUNICATION PROTOCOL

### 15.1 Why gRPC Over REST

| Factor | gRPC | REST |
|--------|------|------|
| **Performance** | Binary (Protobuf) | Text (JSON) |
| **Speed** | ~7x faster serialization | Slower |
| **Type Safety** | Strong typing via .proto | No type safety |
| **Streaming** | Bidirectional streaming | Limited (SSE, WebSocket) |
| **HTTP/2** | Native | Optional |
| **Code Generation** | Automatic clients | Manual |
| **Error Handling** | Rich status codes | HTTP codes only |

**Conclusion:** gRPC is superior for internal service-to-service communication

### 15.2 gRPC Error Handling

```typescript
// apps/api/src/grpc-clients/grpc-error-handler.ts

import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';

export class GrpcErrorHandler {
  static handle(error: any): never {
    // Map gRPC status codes to HTTP status codes
    const statusMap = {
      [status.NOT_FOUND]: 404,
      [status.ALREADY_EXISTS]: 409,
      [status.PERMISSION_DENIED]: 403,
      [status.UNAUTHENTICATED]: 401,
      [status.INVALID_ARGUMENT]: 400,
      [status.INTERNAL]: 500,
      [status.UNAVAILABLE]: 503,
    };

    const httpStatus = statusMap[error.code] || 500;

    throw new RpcException({
      statusCode: httpStatus,
      message: error.details || 'Internal server error',
      service: error.metadata?.get('service')?.[0] || 'unknown'
    });
  }
}

// Usage in service
try {
  const result = await this.aiGrpcClient.generateContent(request);
  return result;
} catch (error) {
  GrpcErrorHandler.handle(error);
}
```

### 15.3 gRPC Connection Pooling

```typescript
// apps/api/src/grpc-clients/grpc-connection-pool.ts

import { loadPackageDefinition, credentials, Channel } from '@grpc/grpc-js';

export class GrpcConnectionPool {
  private channels: Map<string, Channel> = new Map();

  getChannel(address: string): Channel {
    if (!this.channels.has(address)) {
      const channel = new Channel(
        address,
        credentials.createInsecure(),  // Use SSL in production
        {
          'grpc.keepalive_time_ms': 10000,
          'grpc.keepalive_timeout_ms': 5000,
          'grpc.http2.max_pings_without_data': 0,
          'grpc.keepalive_permit_without_calls': 1
        }
      );
      this.channels.set(address, channel);
    }
    return this.channels.get(address)!;
  }

  close(address?: string) {
    if (address) {
      const channel = this.channels.get(address);
      channel?.close();
      this.channels.delete(address);
    } else {
      // Close all channels
      for (const channel of this.channels.values()) {
        channel.close();
      }
      this.channels.clear();
    }
  }
}
```

---

## 16. MONITORING & OBSERVABILITY

### 16.1 Logging Strategy

**Log Levels:**
- ERROR: Failures that prevent operation
- WARN: Degraded operation but still functional
- INFO: Important business events
- DEBUG: Detailed diagnostic information

**What to Log:**
- User actions (via audit log)
- Service-to-service calls
- gRPC requests/responses
- Platform API calls (rate limits, errors)
- Campaign executions (start/complete/fail)
- Workflow executions (step-by-step)
- Extension token captures
- Browser automation sessions
- Authentication events
- Authorization failures

**What NOT to Log:**
- Passwords (never)
- OAuth tokens (never)
- Refresh tokens (never)
- API keys (never)
- Encryption keys (never)
- Sensitive user data (PII)

### 16.2 Metrics to Track

**Application Metrics:**
- Requests per second (RPS)
- Response time (p50, p95, p99)
- Error rate (%)
- Campaign executions per hour
- Workflow executions per hour
- AI API calls per hour
- Extension connections (active count)
- Browser sessions (active count)

**Infrastructure Metrics:**
- CPU utilization (%)
- Memory utilization (%)
- Disk I/O
- Network I/O
- Database connections (active)
- Redis memory usage
- Queue depth (Bull)

**Business Metrics:**
- New user registrations
- Platform connections
- Campaigns created
- Campaigns executed
- Posts published
- AI content generated
- Revenue (if subscriptions)

### 16.3 Alerting Rules

**Critical Alerts (PagerDuty):**
- API error rate > 5%
- Database connection failures
- Redis unavailable
- Service-to-service call failures > 10%
- Disk usage > 90%

**Warning Alerts (Slack):**
- API response time p95 > 1s
- Campaign execution failures > 20%
- Extension disconnections (>50 users affected)
- Queue depth > 1000 jobs

---

## 17. SUCCESS CRITERIA

### 17.1 Definition of Success

The migration is successful when **ALL** of the following are true:

| Criterion | Target | Verification Method |
|-----------|--------|---------------------|
| **Feature Parity** | 100% | Feature preservation matrix all ✅ |
| **Regression Tests** | 100% pass rate | Automated test suite |
| **User Acceptance** | No complaints | User feedback |
| **Performance** | Within 20% of .NET | Load testing |
| **Uptime** | 99.9% | Monitoring dashboard |
| **Security** | Zero plain-text credentials | Security audit |
| **Error Rate** | < 0.1% | Monitoring dashboard |
| **Migration Complete** | Zero .NET service calls | Service logs |

### 17.2 Go/No-Go Checklist for .NET Deprecation

Before turning off .NET services, verify:

- [ ] All features marked NODE_JS_READY in FeatureRouter
- [ ] Zero gRPC calls to .NET services for 14 days
- [ ] All regression tests pass
- [ ] Performance metrics acceptable
- [ ] Error rates same or lower
- [ ] Load testing passed (100 concurrent users)
- [ ] Stress testing passed (1000 campaigns/hour)
- [ ] Manual verification of ALL feature categories
- [ ] User acceptance testing complete
- [ ] No user complaints about missing features
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Rollback plan documented and tested
- [ ] Backup of .NET services created

---

## CONCLUSION

This hybrid architecture preserves **100% of existing functionality** while enabling gradual, safe migration from .NET to Node.js.

**Key Takeaways:**
1. Nothing is deleted prematurely
2. Feature Router automatically routes to correct implementation
3. Migration happens incrementally with verification at each step
4. .NET services remain operational until Node.js achieves full parity
5. Chrome Extension remains integrated as required component
6. Security is prioritized from day 1
7. Multi-tenancy enforced at database level
8. Comprehensive testing ensures no regressions

**Next Steps:** Await user approval to proceed with Phase 1 implementation.

---

**END OF DOCUMENT**
