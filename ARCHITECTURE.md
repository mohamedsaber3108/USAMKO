# USAMKO v2.0 - HYBRID ARCHITECTURE SPECIFICATION

**Document Version:** 1.0  
**Date:** 2026-08-14  
**Architecture Type:** Hybrid Distributed Web Application  
**Primary Objective:** 100% Feature Preservation with Zero Data Loss

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Core Architectural Principles](#2-core-architectural-principles)
3. [Complete Feature Inventory](#3-complete-feature-inventory)
4. [Desktop → Web Feature Mapping](#4-desktop--web-feature-mapping)
5. [Node.js ↔ .NET Service Boundaries](#5-nodejs--net-service-boundaries)
6. [Chrome Extension Responsibilities](#6-chrome-extension-responsibilities)
7. [Browser Automation Responsibilities](#7-browser-automation-responsibilities)
8. [Complete Data Flow Architecture](#8-complete-data-flow-architecture)
9. [Authentication Architecture](#9-authentication-architecture)
10. [Security Architecture](#10-security-architecture)
11. [Migration Plan](#11-migration-plan)
12. [Regression Testing Strategy](#12-regression-testing-strategy)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Feature Preservation Matrix](#14-feature-preservation-matrix)
15. [Service Communication Protocol](#15-service-communication-protocol)
16. [Monitoring & Observability](#16-monitoring--observability)
17. [Success Criteria](#17-success-criteria)

---

## 1. EXECUTIVE SUMMARY

### 1.1 Mission Statement

Transform the USAMKO desktop application into a unified web-based platform while preserving **100% of existing functionality** through a hybrid architecture that leverages both Node.js and .NET services.

### 1.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                 │
│                    (Any Browser, Any OS)                     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  WEB APPLICATION                             │
│              Next.js 15 + React 19                           │
│           (Single Unified Interface)                         │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              API GATEWAY / ORCHESTRATION LAYER               │
│                   NestJS Backend API                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          FEATURE ROUTER / DISPATCHER                 │  │
│  │  (Automatic routing to Node.js or .NET based on      │  │
│  │   feature availability and parity status)            │  │
│  └────────────────┬───────────────────┬─────────────────┘  │
│                   │                   │                      │
│         ┌─────────┴────────┐   ┌─────┴──────────┐          │
│         ▼                  ▼   ▼                ▼          │
│   ┌──────────┐      ┌──────────────────┐  ┌──────────┐    │
│   │ Node.js  │      │  .NET Services   │  │ Workers  │    │
│   │ Services │◄────►│   (gRPC/HTTP)    │  │  (Bull)  │    │
│   └──────────┘      └──────────────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│ PostgreSQL  │  │    Redis     │  │    MinIO     │
│  (Primary)  │  │(Queue/Cache) │  │  (Storage)   │
└─────────────┘  └──────────────┘  └──────────────┘
        
┌─────────────────────────────────────────────────────────────┐
│            AUXILIARY COMPONENTS                              │
│                                                              │
│  ┌────────────────┐         ┌──────────────────┐           │
│  │ Browser Workers│         │ Chrome Extension │           │
│  │  (Playwright)  │         │  (User Browser)  │           │
│  │  Server-Side   │         │   WebSocket ◄────┼───────┐   │
│  └────────────────┘         └──────────────────┘       │   │
│                                                         │   │
└─────────────────────────────────────────────────────────┼───┘
                                                          │
                                         ┌────────────────┘
                                         │
                                   User's Browser
                                 (Extension captures
                                  session tokens)
```

### 1.3 Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Keep .NET as Microservices** | Preserves 100% functionality while Node.js reaches parity |
| **Node.js as Primary API Gateway** | Cloud-native, better for web, modern tooling |
| **Chrome Extension Required** | Essential for browser session token capture |
| **Server-Side Browser Workers** | Platform-agnostic automation where possible |
| **Gradual Migration** | Zero-risk incremental feature porting |
| **Feature Router Pattern** | Transparent failover from Node.js to .NET |

### 1.4 Non-Negotiable Requirements

✅ **Zero Feature Loss** - Every desktop feature must be accessible  
✅ **Functional Parity** - Not just code similarity, actual behavior match  
✅ **Secure by Design** - Credentials encrypted, tokens protected  
✅ **Multi-Tenant Isolation** - Perfect data separation  
✅ **Backward Compatible** - Existing data/configs migrate safely  
✅ **Gradual Migration** - No forced deadlines that sacrifice quality  
✅ **Single User Experience** - User sees one unified application  

---

## 2. CORE ARCHITECTURAL PRINCIPLES

### 2.1 Principle: Function Follows Form

**The architecture adapts to preserve functionality, NOT the other way around.**

- If a feature requires .NET → Keep .NET running
- If a feature requires Chrome Extension → Keep extension integrated
- If a feature requires server browsers → Deploy browser workers
- If a feature requires specific OS → Deploy on appropriate infrastructure

### 2.2 Principle: Transparent Routing

**Users never manually choose which backend serves their request.**

The Feature Router automatically dispatches to:
- Node.js implementation (if parity achieved)
- .NET service (if Node.js not ready)
- Chrome Extension (if browser session required)
- Browser Workers (if automation required)

### 2.3 Principle: Verified Migration Only

**Features migrate from .NET to Node.js only after:**

1. ✅ Implementation complete in Node.js
2. ✅ Regression tests pass (behavior matches .NET)
3. ✅ Edge cases handled identically
4. ✅ Error handling equivalent
5. ✅ Performance acceptable
6. ✅ Manual verification complete
7. ✅ Production monitoring confirms stability

### 2.4 Principle: Fail-Safe Defaults

**System defaults to safety over speed:**

- Unknown features → Route to .NET (guaranteed to work)
- Unclear parity status → Route to .NET
- Error in Node.js implementation → Fallback to .NET
- Extension unavailable → Degrade gracefully with user notification

---

## 3. COMPLETE FEATURE INVENTORY

### 3.1 AI Capabilities

| Feature | .NET File | Node.js File | Status |
|---------|-----------|--------------|--------|
| **OpenAI GPT-4 Integration** | `src/USAMKO.AI/Models/OpenAI/OpenAIProvider.cs` | `apps/api/src/ai/ai.service.ts` | ✅ Parity |
| **Claude AI Integration** | `src/USAMKO.AI/Models/Claude/ClaudeProvider.cs` | ❌ Missing | 🔴 .NET Only |
| **Local LLM Support** | `src/USAMKO.AI/Models/Local/LocalLLMProvider.cs` | ❌ Missing | 🔴 .NET Only |
| **AI Orchestration/Failover** | `src/USAMKO.AI/Orchestration/AIOrchestrator.cs` | ❌ Missing | 🔴 .NET Only |
| **Content Generation** | Both | Both | ✅ Parity |
| **Image Generation (DALL-E)** | Both | Both | ✅ Parity |
| **Multi-Variation Generation** | Both | Both | ✅ Parity |
| **Hashtag Generation** | Both | Both | ✅ Parity |
| **Translation** | Both | Both | ✅ Parity |
| **Sentiment Analysis** | Both | Both | ✅ Parity |
| **Content Improvement** | Both | Both | ✅ Parity |
| **Template-Based Generation** | Both | Both | ✅ Parity |

**Decision:** AI features route to .NET until Claude + Orchestration migrated to Node.js

### 3.2 Platform Adapters

| Platform | Feature | .NET | Node.js | Status |
|----------|---------|------|---------|--------|
| **Facebook** | Post Creation | ✅ | ✅ | ✅ Parity |
| | Post Deletion | ✅ | ✅ | ✅ Parity |
| | Get Comments | ✅ | ❌ | 🔴 .NET Only |
| | Reply to Comments | ✅ | ❌ | 🔴 .NET Only |
| | Get Messages | ✅ | ❌ | 🔴 .NET Only |
| | Send Messages | ✅ | ❌ | 🔴 .NET Only |
| | Post Analytics | ✅ | ❌ | 🔴 .NET Only |
| | Token Refresh | ✅ | ✅ | ✅ Parity |
| **Instagram** | Post Creation | ✅ | ✅ | ✅ Parity |
| | Get Comments | ✅ | ❌ | 🔴 .NET Only |
| | Reply to Comments | ✅ | ❌ | 🔴 .NET Only |
| | Post Analytics | ✅ | ❌ | 🔴 .NET Only |
| **Twitter** | Post Creation | ✅ | ✅ | ✅ Parity |
| | Post Analytics | ✅ | ❌ | 🔴 .NET Only |
| **LinkedIn** | ❌ | ✅ | ✅ Node.js Only |
| **WhatsApp** | ❌ | ✅ | ✅ Node.js Only |
| **Pinterest** | ✅ enum | ❌ | 🔴 .NET Only |
| **Reddit** | ✅ enum | ❌ | 🔴 .NET Only |
| **YouTube** | ✅ enum | ❌ | 🔴 .NET Only |
| **TikTok** | ✅ enum | ❌ | 🔴 .NET Only |
| **Telegram** | ✅ enum | ❌ | 🔴 .NET Only |
| **VK** | ✅ enum | ❌ | 🔴 .NET Only |
| **Snapchat** | ✅ enum | ❌ | 🔴 .NET Only |
| **Threads** | ✅ enum | ❌ | 🔴 .NET Only |

**Decision:** Platform operations route based on feature availability

### 3.3 Workflow Engine

| Feature | .NET | Node.js | Status |
|---------|------|---------|--------|
| **Workflow CRUD** | ✅ | ✅ Basic | ⚠️ Partial |
| **Visual Workflow Builder** | ✅ Full | ❌ | 🔴 .NET Only |
| **Step Types:** | | | |
| - Delay | ✅ | ❌ | 🔴 .NET Only |
| - Post | ✅ | ❌ | 🔴 .NET Only |
| - AI Generate | ✅ | ❌ | 🔴 .NET Only |
| - Condition (if/then/else) | ✅ | ❌ | 🔴 .NET Only |
| - Loop | ✅ | ❌ | 🔴 .NET Only |
| - Browser Action | ✅ | ❌ | 🔴 .NET Only |
| **Variable Substitution** | ✅ `{{var}}` | ❌ | 🔴 .NET Only |
| **Parallel Execution** | ✅ | ❌ | 🔴 .NET Only |
| **Error Recovery** | ✅ | ❌ | 🔴 .NET Only |
| **Workflow Context** | ✅ | ❌ | 🔴 .NET Only |
| **Detailed Execution Logs** | ✅ | ❌ Basic | 🔴 .NET Only |
| **Workflow Scheduling** | ✅ | ✅ Basic | ⚠️ Partial |

**Decision:** ALL workflow execution routes to .NET until full engine ported

### 3.4 Browser Automation

| Feature | .NET | Node.js | Status |
|---------|------|---------|--------|
| **Playwright Integration** | ✅ | ✅ | ✅ Parity |
| **Anti-Detection Scripts** | ✅ Basic | ✅ Advanced | ✅ Node.js Better |
| **Browser Profiles** | ✅ Persistent | ⚠️ Session-only | ⚠️ Partial |
| **Cookie Persistence** | ✅ | ⚠️ | ⚠️ Partial |
| **Human Behavior Simulation** | ❌ | ✅ | ✅ Node.js Only |
| **Captcha Solving** | ❌ | ✅ | ✅ Node.js Only |
| **Proxy Rotation** | ⚠️ Basic | ✅ Advanced | ✅ Node.js Better |
| **Session Management** | ✅ | ✅ | ✅ Parity |

**Decision:** Browser automation uses Node.js (superior), add profile persistence

### 3.5 Plugin System

| Feature | .NET | Node.js | Status |
|---------|------|---------|--------|
| **Plugin SDK** | ✅ Full | ❌ | 🔴 .NET Only |
| **Plugin Loader** | ✅ | ❌ | 🔴 .NET Only |
| **Runtime Plugin Loading** | ✅ | ❌ | 🔴 .NET Only |
| **Plugin Isolation** | ✅ AssemblyLoadContext | ❌ | 🔴 .NET Only |
| **Custom Workflow Steps** | ✅ | ❌ | 🔴 .NET Only |
| **Custom Platform Connectors** | ✅ | ❌ | 🔴 .NET Only |
| **Custom AI Providers** | ✅ | ❌ | 🔴 .NET Only |

**Decision:** Plugin system remains .NET-only until Node.js plugin architecture built

### 3.6 Security & Encryption

| Feature | .NET | Node.js | Status |
|---------|------|---------|--------|
| **Credential Vault** | ✅ Encrypted file | ❌ | 🔴 .NET Only |
| **AES-256 Encryption** | ✅ | ❌ | 🔴 .NET Only |
| **OAuth Token Encryption** | ✅ At rest | ❌ Plain DB | 🔴 SECURITY RISK |
| **Password Hashing** | ✅ BCrypt (12 rounds) | ✅ BCrypt (10 rounds) | ⚠️ Node.js Weaker |
| **JWT Tokens** | ✅ | ✅ | ✅ Parity |
| **Two-Factor Auth** | ✅ | ❌ | 🔴 .NET Only |

**Decision:** Implement encryption in Node.js IMMEDIATELY (Phase 1 priority)

### 3.7 Data Models & Features

| Feature | .NET | Node.js | Status |
|---------|------|---------|--------|
| **User Management** | ✅ Full (20+ fields) | ✅ Basic | ⚠️ Partial |
| **Multi-Tenancy** | ❌ | ✅ Full | ✅ Node.js Better |
| **Content Library** | ✅ ContentItem model | ❌ | 🔴 .NET Only |
| **Prompt Templates** | ✅ PromptTemplate model | ❌ | 🔴 .NET Only |
| **Campaign System** | ⚠️ Basic | ✅ Full | ✅ Node.js Better |
| **Email Verification** | ⚠️ Basic | ✅ Full | ✅ Node.js Better |
| **Password Reset** | ⚠️ Basic | ✅ Full | ✅ Node.js Better |
| **Subscription Management** | ✅ | ❌ | 🔴 .NET Only |
| **User Lockout** | ✅ | ❌ | 🔴 .NET Only |

**Decision:** Use best-of-breed from each platform

### 3.8 Chrome Extension Features

| Feature | Implementation | Status |
|---------|---------------|--------|
| **Facebook GraphQL Token Capture** | Extension only | ✅ Keep |
| **Facebook Business Page Tokens** | Extension only | ✅ Keep |
| **Twitter API Header Capture** | Extension only | ✅ Keep |
| **Instagram Token Capture** | Extension only | ✅ Keep |
| **Token Relay to Backend** | Extension → WebSocket → Node.js | 🔨 Build |
| **User Authentication** | JWT from localStorage | 🔨 Build |
| **Connection Status Indicator** | Extension badge | 🔨 Build |

**Decision:** Extension is REQUIRED and INTEGRATED, not optional

---

## 4. DESKTOP → WEB FEATURE MAPPING

### 4.1 User Journey: Campaign Creation

| Step | Desktop App | Web App | Backend | Status |
|------|-------------|---------|---------|--------|
| 1. Login | WPF Window | `/login` page | Node.js Auth | ✅ Ready |
| 2. Dashboard | WPF Dashboard | `/dashboard` | Node.js Analytics | ✅ Ready |
| 3. Create Campaign | Campaign Dialog | `/campaigns/create` | Node.js Campaign Service | ✅ Ready |
| 4. Select Platforms | Checkboxes | Multi-select UI | PlatformAccount query | ✅ Ready |
| 5. AI Content Gen | AI Panel | `/ai/generate` modal | **→ .NET AI Orchestrator** | 🔴 Routes to .NET |
| 6. Configure Schedule | Date/Time Picker | React Date Picker | Node.js Scheduler | ✅ Ready |
| 7. Start Campaign | Button | Button | Bull Queue | ✅ Ready |
| 8. Execute | Background Worker | Bull Worker | **→ .NET if workflow** | ⚠️ Conditional |
| 9. Monitor Progress | Progress Bar | Real-time WebSocket | Node.js Events | ✅ Ready |
| 10. View Results | Results Dialog | `/campaigns/:id/results` | Node.js Analytics | ✅ Ready |

### 4.2 User Journey: Workflow Automation

| Step | Desktop App | Web App | Backend | Status |
|------|-------------|---------|---------|--------|
| 1. Open Workflow Builder | Workflow Window | `/workflow-builder` | React Flow UI | ✅ Ready |
| 2. Drag Nodes | WPF Canvas | React Flow | Frontend only | ✅ Ready |
| 3. Configure Node | Property Panel | Modal/Sidebar | Validation | ✅ Ready |
| 4. Add Conditions | Condition Dialog | Condition Builder | **→ .NET Workflow Engine** | 🔴 Routes to .NET |
| 5. Add Loops | Loop Dialog | Loop Builder | **→ .NET Workflow Engine** | 🔴 Routes to .NET |
| 6. Save Workflow | Save Button | Save Button | Node.js CRUD | ✅ Ready |
| 7. Execute Workflow | Run Button | Run Button | **→ .NET Workflow Engine** | 🔴 Routes to .NET |
| 8. Monitor Execution | Execution Log | Real-time Log UI | **→ .NET Logs** | 🔴 Routes to .NET |

### 4.3 User Journey: Platform Connection

| Step | Desktop App | Web App | Backend | Status |
|------|-------------|---------|---------|--------|
| 1. Add Account | Platforms Window | `/platforms` | Frontend | ✅ Ready |
| 2. Choose Platform | Dropdown | Platform Grid | Frontend | ✅ Ready |
| 3. OAuth Flow | Opens Browser | OAuth Redirect | Node.js Passport | ✅ Ready |
| 4. Store Tokens | **→ .NET Credential Vault** | **→ Node.js Encrypted DB** | 🔨 Build encryption | 🔴 Build First |
| 5. Verify Connection | Test API Call | Test API Call | Platform Adapter | ✅ Ready |
| 6. (Optional) Install Extension | Manual | Settings → Extension Guide | Frontend | 🔨 Build UI |
| 7. Extension Captures Tokens | Extension → Local Storage | Extension → WebSocket → Backend | 🔨 Build relay | 🔴 Build First |

### 4.4 User Journey: AI Content Generation

| Step | Desktop App | Web App | Backend | Status |
|------|-------------|---------|---------|--------|
| 1. Open AI Generator | AI Panel | `/ai/generate` | Frontend | ✅ Ready |
| 2. Choose Provider | Dropdown (OpenAI/Claude/Local) | Dropdown | **→ .NET AI Orchestrator** | 🔴 Routes to .NET |
| 3. Enter Prompt | TextBox | TextArea | Frontend | ✅ Ready |
| 4. Set Parameters | Sliders | Sliders | Frontend | ✅ Ready |
| 5. Generate | Generate Button | Generate Button | **→ .NET (if Claude/Local)** | ⚠️ Conditional |
| 6. View Result | Result Panel | Result Display | Frontend | ✅ Ready |
| 7. Save to Library | Save Button | Save Button | **→ .NET ContentItem** | 🔴 Routes to .NET |

---

## 5. NODE.JS ↔ .NET SERVICE BOUNDARIES

### 5.1 Service Communication Protocol: gRPC

**Decision: Use gRPC for Node.js ↔ .NET communication**

**Rationale:**
- ✅ High performance (binary protocol, HTTP/2)
- ✅ Strongly typed (protobuf schemas)
- ✅ Bidirectional streaming support
- ✅ Native support in both .NET and Node.js
- ✅ Better than REST for internal service communication
- ✅ Automatic client generation from `.proto` files

**Alternative Considered:**
- ❌ REST/HTTP - Less efficient, no type safety
- ❌ Message Queue (RabbitMQ) - Adds latency, overkill for request-response

### 5.2 .NET Services Architecture

**.NET will be decomposed into microservices:**

```
┌─────────────────────────────────────────────────────────┐
│              .NET MICROSERVICES LAYER                    │
│                                                          │
│  ┌────────────────────┐  ┌─────────────────────────┐  │
│  │  AI Service        │  │  Workflow Service       │  │
│  │  Port: 5001        │  │  Port: 5002             │  │
│  │  gRPC Server       │  │  gRPC Server            │  │
│  │                    │  │                         │  │
│  │  • AIOrchestrator  │  │  • WorkflowEngine       │  │
│  │  • OpenAI Provider │  │  • Step Execution       │  │
│  │  • Claude Provider │  │  • Conditional Logic    │  │
│  │  • Local LLM       │  │  • Loop Handling        │  │
│  │  • Failover Logic  │  │  • Variable Resolution  │  │
│  └────────────────────┘  └─────────────────────────┘  │
│                                                          │
│  ┌────────────────────┐  ┌─────────────────────────┐  │
│  │  Security Service  │  │  Plugin Service         │  │
│  │  Port: 5003        │  │  Port: 5004             │  │
│  │  gRPC Server       │  │  gRPC Server            │  │
│  │                    │  │                         │  │
│  │  • Credential Vault│  │  • Plugin Loader        │  │
│  │  • AES Encryption  │  │  • Plugin Registry      │  │
│  │  • Token Encryption│  │  • Runtime Loading      │  │
│  └────────────────────┘  └─────────────────────────┘  │
│                                                          │
│  ┌────────────────────┐  ┌─────────────────────────┐  │
│  │  Content Service   │  │  Platform Service       │  │
│  │  Port: 5005        │  │  Port: 5006             │  │
│  │  gRPC Server       │  │  gRPC Server            │  │
│  │                    │  │                         │  │
│  │  • ContentItem DB  │  │  • Comments API         │  │
│  │  • Template DB     │  │  • Messaging API        │  │
│  │  • AI Tracking     │  │  • Analytics API        │  │
│  └────────────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 5.3 gRPC Service Definitions

**File:** `protos/ai.service.proto`
```protobuf
syntax = "proto3";

package usamko.ai;

service AIService {
  rpc GenerateContent (GenerateContentRequest) returns (GenerateContentResponse);
  rpc GenerateImage (GenerateImageRequest) returns (GenerateImageResponse);
  rpc Translate (TranslateRequest) returns (TranslateResponse);
  rpc AnalyzeSentiment (AnalyzeSentimentRequest) returns (AnalyzeSentimentResponse);
}

message GenerateContentRequest {
  string prompt = 1;
  string provider = 2;  // "openai" | "claude" | "local"
  string model = 3;
  string tone = 4;
  string platform = 5;
  int32 max_tokens = 6;
  string tenant_id = 7;
  string user_id = 8;
}

message GenerateContentResponse {
  string content = 1;
  string provider_used = 2;
  bool failover_occurred = 3;
  int32 tokens_used = 4;
  string error = 5;
}
```

**File:** `protos/workflow.service.proto`
```protobuf
syntax = "proto3";

package usamko.workflow;

service WorkflowService {
  rpc ExecuteWorkflow (ExecuteWorkflowRequest) returns (stream WorkflowExecutionEvent);
  rpc ValidateWorkflow (ValidateWorkflowRequest) returns (ValidateWorkflowResponse);
  rpc GetExecutionLogs (GetExecutionLogsRequest) returns (GetExecutionLogsResponse);
}

message ExecuteWorkflowRequest {
  string workflow_id = 1;
  string execution_id = 2;
  map<string, string> input_variables = 3;
  string tenant_id = 4;
  string user_id = 5;
}

message WorkflowExecutionEvent {
  string execution_id = 1;
  string step_id = 2;
  string status = 3;  // "started" | "completed" | "failed"
  string message = 4;
  map<string, string> output_variables = 5;
  int32 progress_percent = 6;
}
```

**File:** `protos/security.service.proto`
```protobuf
syntax = "proto3";

package usamko.security;

service SecurityService {
  rpc EncryptCredential (EncryptRequest) returns (EncryptResponse);
  rpc DecryptCredential (DecryptRequest) returns (DecryptResponse);
  rpc StoreInVault (StoreInVaultRequest) returns (StoreInVaultResponse);
  rpc RetrieveFromVault (RetrieveFromVaultRequest) returns (RetrieveFromVaultResponse);
}

message EncryptRequest {
  string plaintext = 1;
  string tenant_id = 2;
}

message EncryptResponse {
  string ciphertext = 1;
  string initialization_vector = 2;
}
```

### 5.4 Node.js Service Proxy Layer

**File:** `apps/api/src/grpc-clients/ai-client.service.ts`
```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { loadPackageDefinition, credentials } from '@grpc/grpc-js';
import { loadSync } from '@grpc/proto-loader';

@Injectable()
export class AIGrpcClient implements OnModuleInit {
  private client: any;

  onModuleInit() {
    const packageDefinition = loadSync('protos/ai.service.proto');
    const protoDescriptor = loadPackageDefinition(packageDefinition);
    const AIService = protoDescriptor.usamko.ai.AIService;
    
    this.client = new AIService(
      'localhost:5001',
      credentials.createInsecure() // Use SSL in production
    );
  }

  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    return new Promise((resolve, reject) => {
      this.client.GenerateContent(request, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
  }
}
```

### 5.5 Feature Router Implementation

**File:** `apps/api/src/routing/feature-router.service.ts`
```typescript
import { Injectable } from '@nestjs/common';

enum FeatureStatus {
  NODE_JS_READY = 'nodejs',
  DOTNET_ONLY = 'dotnet',
  PARTIAL_NODE_JS = 'partial'
}

@Injectable()
export class FeatureRouter {
  // Feature parity tracking
  private featureMap = new Map<string, FeatureStatus>([
    // AI Features
    ['ai.generate.openai', FeatureStatus.NODE_JS_READY],
    ['ai.generate.claude', FeatureStatus.DOTNET_ONLY],
    ['ai.generate.local', FeatureStatus.DOTNET_ONLY],
    ['ai.orchestration', FeatureStatus.DOTNET_ONLY],
    
    // Workflow Features
    ['workflow.execute', FeatureStatus.DOTNET_ONLY],
    ['workflow.conditional', FeatureStatus.DOTNET_ONLY],
    ['workflow.loop', FeatureStatus.DOTNET_ONLY],
    
    // Platform Features
    ['platform.facebook.post', FeatureStatus.NODE_JS_READY],
    ['platform.facebook.comments', FeatureStatus.DOTNET_ONLY],
    ['platform.facebook.messages', FeatureStatus.DOTNET_ONLY],
    ['platform.facebook.analytics', FeatureStatus.DOTNET_ONLY],
    
    // Security Features
    ['security.encrypt', FeatureStatus.DOTNET_ONLY],  // Until Node.js encryption built
    ['security.vault', FeatureStatus.DOTNET_ONLY],
    
    // Campaign Features
    ['campaign.create', FeatureStatus.NODE_JS_READY],
    ['campaign.execute', FeatureStatus.NODE_JS_READY],
  ]);

  shouldRouteToDotNet(feature: string): boolean {
    const status = this.featureMap.get(feature);
    return status === FeatureStatus.DOTNET_ONLY;
  }

  canFallbackToDotNet(feature: string): boolean {
    const status = this.featureMap.get(feature);
    return status !== FeatureStatus.NODE_JS_READY;
  }

  // Update feature status after migration
  markAsNodeJsReady(feature: string) {
    this.featureMap.set(feature, FeatureStatus.NODE_JS_READY);
    // Persist to database for distributed deployments
  }
}
```

### 5.6 Service Boundary Matrix

| Responsibility | Node.js | .NET | Rationale |
|----------------|---------|------|-----------|
| **HTTP API Gateway** | ✅ Primary | ❌ | Node.js better for web APIs |
| **User Authentication** | ✅ | ❌ | Node.js has OAuth strategies |
| **Multi-Tenancy** | ✅ | ❌ | Node.js has full implementation |
| **Campaign CRUD** | ✅ | ❌ | Node.js complete |
| **Campaign Execution** | ✅ | ⚠️ If workflow | Node.js unless uses workflow engine |
| **Basic Platform Posting** | ✅ | ❌ | Node.js adapters work |
| **Platform Comments/Messages** | ❌ | ✅ | .NET until Node.js migrated |
| **Platform Analytics** | ❌ | ✅ | .NET until Node.js migrated |
| **AI Generation (OpenAI)** | ✅ | ⚠️ Failover | Node.js works, .NET for failover |
| **AI Generation (Claude)** | ❌ | ✅ | .NET only |
| **AI Generation (Local LLM)** | ❌ | ✅ | .NET only (can't run in cloud) |
| **AI Orchestration** | ❌ | ✅ | .NET until Node.js migrated |
| **Workflow Execution** | ❌ | ✅ | .NET until full engine migrated |
| **Workflow CRUD** | ✅ | ❌ | Node.js stores definitions |
| **Plugin Loading** | ❌ | ✅ | .NET only architecture |
| **Credential Encryption** | ❌ | ✅ | .NET until Node.js encryption built |
| **Credential Vault** | ❌ | ✅ | .NET until Node.js vault built |
| **2FA** | ❌ | ✅ | .NET until Node.js 2FA built |
| **Subscription Management** | ❌ | ✅ | .NET until Node.js billing built |
| **Content Library** | ❌ | ✅ | .NET until Node.js library built |
| **Prompt Templates** | ❌ | ✅ | .NET until Node.js templates built |
| **Browser Automation** | ✅ | ❌ | Node.js superior (human behavior, captcha) |
| **Background Jobs (Bull)** | ✅ | ❌ | Node.js job system |
| **WebSocket (Extension)** | ✅ | ❌ | Node.js Socket.io |
| **Database (Prisma)** | ✅ | ❌ | Node.js primary ORM |
| **Caching (Redis)** | ✅ | ❌ | Node.js caching service |
| **File Storage (MinIO/S3)** | ✅ | ❌ | Node.js storage service |

---

## 6. CHROME EXTENSION RESPONSIBILITIES

### 6.1 Extension Architecture

```
┌──────────────────────────────────────────────────────────┐
│               USER'S BROWSER (Chrome/Edge)                │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │  BACKGROUND SERVICE WORKER                          │ │
│  │  (chromeExt/background.js)                         │ │
│  │                                                     │ │
│  │  chrome.webRequest.onBeforeRequest listeners:      │ │
│  │  ┌─────────────────────────────────────────────┐  │ │
│  │  │ 1. Facebook GraphQL Interceptor             │  │ │
│  │  │    • facebook.com/api/graphql/              │  │ │
│  │  │    • Captures: fb_dtsg, doc_id, variables   │  │ │
│  │  └─────────────────────────────────────────────┘  │ │
│  │  ┌─────────────────────────────────────────────┐  │ │
│  │  │ 2. Facebook Business Page Interceptor       │  │ │
│  │  │    • business.facebook.com/api/graphql/     │  │ │
│  │  │    • Captures: pageID, __user, fb_dtsg      │  │ │
│  │  └─────────────────────────────────────────────┘  │ │
│  │  ┌─────────────────────────────────────────────┐  │ │
│  │  │ 3. Twitter API Interceptor                  │  │ │
│  │  │    • twitter.com/i/api/graphql/             │  │ │
│  │  │    • Captures: All request headers          │  │ │
│  │  └─────────────────────────────────────────────┘  │ │
│  │  ┌─────────────────────────────────────────────┐  │ │
│  │  │ 4. Instagram API Interceptor                │  │ │
│  │  │    • instagram.com/api/v1/                  │  │ │
│  │  │    • Captures: X-CSRFToken, X-IG-App-ID     │  │ │
│  │  └─────────────────────────────────────────────┘  │ │
│  │                                                     │ │
│  │  ┌──────────────────────────────────────────────┐ │ │
│  │  │  WebSocket Client                            │ │ │
│  │  │  ws://yourdomain.com/ws/extension            │ │ │
│  │  │  • Authenticated with JWT                    │ │ │
│  │  │  • Sends captured tokens                     │ │ │
│  │  │  • Receives acknowledgments                  │ │ │
│  │  │  • Reconnection logic                        │ │ │
│  │  └──────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │  CONTENT SCRIPT                                    │ │
│  │  (chromeExt/content.js)                            │ │
│  │  • Message relay: background ↔ page               │ │
│  │  • Injects pageScript.js                           │ │
│  │  • Keepalive ping                                  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │  PAGE SCRIPT                                       │ │
│  │  (chromeExt/pageScript.js)                        │ │
│  │  • Stores intercepted data in window.usamko       │ │
│  │  • (Legacy, may not be needed in hybrid arch)     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │  POPUP UI                                          │ │
│  │  (chromeExt/popup.html)                           │ │
│  │  • Connection status indicator                     │ │
│  │  • Shows: "Connected ✓" or "Disconnected"         │ │
│  │  • Platform account mapping                        │ │
│  │  • Manual token send button                       │ │
│  │  • Settings link → Web App                        │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
                            │
                            │ WebSocket (wss://)
                            ▼
┌──────────────────────────────────────────────────────────┐
│              NODE.JS BACKEND (API Server)                 │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │  EXTENSION GATEWAY                                 │ │
│  │  (Socket.io WebSocket Server)                      │ │
│  │  apps/api/src/extension/extension.gateway.ts      │ │
│  │                                                     │ │
│  │  @WebSocketGateway({ namespace: '/extension' })   │ │
│  │                                                     │ │
│  │  handleConnection(client: Socket) {                │ │
│  │    1. Verify JWT from handshake auth               │ │
│  │    2. Extract userId + tenantId                    │ │
│  │    3. Store socket in active connections map       │ │
│  │    4. Send acknowledgment                          │ │
│  │  }                                                  │ │
│  │                                                     │ │
│  │  handleTokenCapture(payload) {                     │ │
│  │    1. Validate payload schema                      │ │
│  │    2. Identify platform account                    │ │
│  │    3. Encrypt token data                           │ │
│  │    4. Store in PlatformAccount.cookies             │ │
│  │    5. Send success response                        │ │
│  │    6. Emit 'advanced-features-enabled' event       │ │
│  │  }                                                  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌────────────────────────────────────────────────────┐ │
│  │  TOKEN ENCRYPTION SERVICE                          │ │
│  │  apps/api/src/security/encryption.service.ts       │ │
│  │  • AES-256-GCM encryption                          │ │
│  │  • Per-tenant encryption keys                      │ │
│  │  • Token rotation on capture                       │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Extension Features & Requirements

| Feature | Purpose | Status |
|---------|---------|--------|
| **Facebook GraphQL Interception** | Capture `fb_dtsg`, reaction data, group member lists | ✅ Existing |
| **Facebook Business Page Interception** | Capture page messaging tokens | ✅ Existing |
| **Twitter Header Capture** | Capture auth headers for Twitter API | ✅ Existing |
| **Instagram Token Capture** | Capture CSRF token and App ID | ✅ Existing |
| **WebSocket Communication** | Real-time token relay to backend | 🔨 Build |
| **JWT Authentication** | Authenticate extension to backend | 🔨 Build |
| **Connection Status UI** | Show user connection state | 🔨 Build |
| **Platform Account Mapping** | Associate tokens with correct account | 🔨 Build |
| **Automatic Reconnection** | Handle network interruptions | 🔨 Build |
| **Token Expiry Detection** | Prompt user when tokens need refresh | 🔨 Build |
| **Chrome Web Store Publishing** | Distribution channel | 🔨 Publish |

### 6.3 Extension Installation Flow

```
User visits Web App → Clicks "Connect Platform" 
→ Web App detects Extension not installed
→ Shows modal:
   ┌──────────────────────────────────────────────┐
   │  🔌 Extension Required for Advanced Features │
   │                                               │
   │  Some platform features require the USAMKO   │
   │  browser extension to work properly.         │
   │                                               │
   │  ✓ Group member scraping                     │
   │  ✓ Reaction data collection                  │
   │  ✓ Business page messaging                   │
   │                                               │
   │  [Install from Chrome Web Store]             │
   │  [Continue without extension]                │
   └──────────────────────────────────────────────┘

→ User clicks "Install from Chrome Web Store"
→ Opens Chrome Web Store link
→ User installs extension
→ Extension requests permission for facebook.com, twitter.com, instagram.com
→ User approves
→ Extension connects to backend via WebSocket
→ Extension reads JWT from localStorage (user already logged into Web App)
→ Backend validates JWT, stores socket connection
→ Web App detects extension connected
→ Shows success message: "✓ Advanced features enabled"
```

### 6.4 Extension Security Model

**Authentication:**
1. User logs into Web App → receives JWT
2. JWT stored in `localStorage`
3. Extension reads JWT via `chrome.storage.local` (synced from Web App)
4. Extension sends JWT in WebSocket handshake
5. Backend validates JWT, extracts `userId` + `tenantId`
6. All captured tokens associated with authenticated user

**Token Encryption:**
- Tokens encrypted with AES-256-GCM before storage
- Encryption key derived from user's account + master key
- One user cannot decrypt another user's tokens

**Transport Security:**
- WebSocket over TLS (wss://)
- Certificate pinning in production
- Token payloads never logged

**Permission Model:**
- Extension only accesses facebook.com, twitter.com, instagram.com
- No access to other websites
- Users can revoke extension anytime

### 6.5 Extension → Backend Message Protocol

**Message Type: Token Capture**
```json
{
  "type": "TOKEN_CAPTURE",
  "payload": {
    "platform": "facebook",
    "accountId": "123456789",
    "tokens": {
      "fb_dtsg": "AQHDa...",
      "doc_id": "5678",
      "__dyn": "xyz...",
      "cookies": [
        {"name": "c_user", "value": "123456789"},
        {"name": "xs", "value": "abc..."}
      ]
    },
    "capturedAt": "2026-08-14T10:30:00Z"
  }
}
```

**Backend Response:**
```json
{
  "type": "TOKEN_CAPTURE_ACK",
  "success": true,
  "message": "Tokens encrypted and stored successfully",
  "advancedFeaturesEnabled": true
}
```

**Message Type: Connection Status**
```json
{
  "type": "CONNECTION_STATUS",
  "payload": {
    "connected": true,
    "userId": "user_abc123",
    "connectedPlatforms": ["facebook", "twitter", "instagram"]
  }
}
```

---

## 7. BROWSER AUTOMATION RESPONSIBILITIES

### 7.1 Server-Side vs Client-Side Browser Automation

| Task | Server-Side Worker | Chrome Extension | Rationale |
|------|-------------------|------------------|-----------|
| **Post Creation** | ✅ Preferred | ❌ | Official API works, no session needed |
| **Scheduled Posts** | ✅ Required | ❌ | Server runs 24/7 |
| **Following Accounts** | ✅ Preferred | ⚠️ Fallback | Server can create sessions, extension if detected |
| **Liking Posts** | ✅ Preferred | ⚠️ Fallback | Server can simulate, extension for real session |
| **Commenting** | ✅ Preferred | ⚠️ Fallback | Server can use API or browser |
| **Scraping Group Members** | ❌ Cannot | ✅ Required | Requires real user session with group access |
| **Scraping Reactions** | ❌ Cannot | ✅ Required | Requires GraphQL with user tokens |
| **Business Page Messaging** | ❌ Cannot | ✅ Required | Requires page admin session |
| **Profile Analytics** | ✅ API | ❌ | Official API sufficient |
| **Automated DMs** | ⚠️ With tokens | ✅ Preferred | Extension has real session |

### 7.2 Browser Worker Architecture

```
┌────────────────────────────────────────────────────────────┐
│              NODE.JS API SERVER (EC2)                       │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  CAMPAIGN EXECUTOR (Bull Worker)                      │ │
│  │                                                        │ │
│  │  Campaign Type: FOLLOW                                │ │
│  │  ↓                                                     │ │
│  │  Needs browser automation                             │ │
│  │  ↓                                                     │ │
│  │  Calls BrowserService.createSession()                 │ │
│  └──────────────────────┬─────────────────────────────────┘ │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  BROWSER SERVICE                                     │ │
│  │  apps/api/src/automation/browser.service.ts          │ │
│  │                                                       │ │
│  │  Session Pool: Map<string, BrowserSession>           │ │
│  │  • Max 10 concurrent sessions                        │ │
│  │  • Auto-cleanup after 5min idle                      │ │
│  │  • Per-user/per-tenant isolation                     │ │
│  │                                                       │ │
│  │  createSession(config):                              │ │
│  │    1. Check pool capacity                            │ │
│  │    2. Launch Chromium with Playwright                │ │
│  │    3. Apply anti-detection scripts                   │ │
│  │    4. Set user agent, viewport, locale               │ │
│  │    5. Apply proxy if configured                      │ │
│  │    6. Load cookies from DB if available              │ │
│  │    7. Return session ID                              │ │
│  │                                                       │ │
│  │  Anti-Detection:                                     │ │
│  │  • addInitScript(() => {                             │ │
│  │      delete navigator.webdriver;                     │ │
│  │      Object.defineProperty(navigator, 'plugins', {   │ │
│  │        get: () => [/* fake plugins */]              │ │
│  │      });                                             │ │
│  │      // Canvas fingerprint randomization            │ │
│  │      // WebGL fingerprint spoofing                  │ │
│  │    });                                               │ │
│  └──────────────────────────────────────────────────────┘ │
│                         │                                   │
│                         ▼                                   │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  CHROMIUM PROCESSES (Playwright)                     │ │
│  │                                                       │ │
│  │  Browser 1 (User A, Campaign 1) ──┐                 │ │
│  │  Browser 2 (User A, Campaign 2) ──┼── Isolated     │ │
│  │  Browser 3 (User B, Campaign 3) ──┤   contexts      │ │
│  │  ...                               │                 │ │
│  │  Browser 10 (User X, Campaign Y) ──┘                │ │
│  │                                                       │ │
│  │  Each browser:                                       │ │
│  │  • Runs in Docker container (optional)               │ │
│  │  • Has own cookies/localStorage                      │ │
│  │  • Cannot access other sessions                      │ │
│  │  • Auto-terminates on timeout                        │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  HUMAN BEHAVIOR SERVICE                              │ │
│  │  apps/api/src/automation/human-behavior.service.ts   │ │
│  │                                                       │ │
│  │  humanType(text): Types with random 50-150ms delays  │ │
│  │  humanMouseMove(x, y): Bezier curve movements        │ │
│  │  humanClick(element): Random point + pause           │ │
│  │  humanScroll(): Natural variable-speed scrolling     │ │
│  │  simulateReading(): Random pauses while reading      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  CAPTCHA SERVICE                                     │ │
│  │  apps/api/src/automation/captcha.service.ts          │ │
│  │                                                       │ │
│  │  Integrations:                                       │ │
│  │  • 2Captcha API                                      │ │
│  │  • AntiCaptcha API                                   │ │
│  │                                                       │ │
│  │  solveRecaptchaV2(), solveRecaptchaV3(),            │ │
│  │  solveHCaptcha()                                     │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  PROXY SERVICE                                       │ │
│  │  apps/api/src/automation/proxy.service.ts            │ │
│  │                                                       │ │
│  │  Proxy Pool: [proxy1, proxy2, ...]                  │ │
│  │  • Round-robin selection                             │ │
│  │  • Geo-targeting (US, UK, etc.)                      │ │
│  │  • Failure tracking (disable after 3 fails)          │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

### 7.3 Browser Profile Persistence

**Current Gap:** Node.js browser service doesn't persist profiles

**.NET Has:** `BrowserProfile` class with persistent storage

**Solution:** Add profile persistence to Node.js

```typescript
// apps/api/src/automation/browser-profile.model.ts
export interface BrowserProfile {
  id: string;
  userId: string;
  tenantId: string;
  name: string;
  userAgent: string;
  viewport: { width: number; height: number };
  locale: string;
  timezone: string;
  cookies: Array<{ name: string; value: string; domain: string }>;
  localStorage: Record<string, string>;
  fingerprint: {
    canvas: string;
    webgl: string;
    fonts: string[];
  };
  lastUsedAt: Date;
  createdAt: Date;
}

// Store in database: PrismaClient.browserProfile.create()
// Load on session creation: loadProfile(profileId)
// Save on session close: saveProfile(sessionId)
```

**Migration Task:** Port .NET BrowserProfile to Node.js (1 week effort)

---

## 8. COMPLETE DATA FLOW ARCHITECTURE

### 8.1 Data Flow: User Creates Campaign

```
┌────────────────────────────────────────────────────────────────┐
│ STEP 1: User Action (Web UI)                                   │
│ User fills campaign form → clicks "Create Campaign"            │
└────────────────────────┬───────────────────────────────────────┘
                         │ POST /campaigns
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 2: Node.js API Gateway                                    │
│ apps/api/src/campaigns/campaign.controller.ts                  │
│                                                                 │
│ @Post('/')                                                      │
│ @UseGuards(JwtAuthGuard, TenantGuard)                          │
│ create(@Body() dto, @CurrentUser() user) {                     │
│   return this.campaignService.create(dto, user.tenantId);      │
│ }                                                               │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 3: Campaign Service (Node.js)                             │
│ apps/api/src/campaigns/campaign.service.ts                     │
│                                                                 │
│ async create(dto, tenantId) {                                  │
│   // Validate input                                            │
│   // Check platform accounts exist                             │
│   // Check user has permission                                 │
│   const campaign = await this.prisma.campaign.create({         │
│     data: {                                                     │
│       tenantId,                                                 │
│       type: dto.type,                                           │
│       config: dto.config,                                       │
│       status: 'DRAFT'                                           │
│     }                                                           │
│   });                                                           │
│   return campaign;                                              │
│ }                                                               │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 4: PostgreSQL (via Prisma)                                │
│ INSERT INTO "Campaign" (id, tenantId, type, config, ...)       │
│ RETURNING *;                                                    │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 5: Response to User                                       │
│ HTTP 201 Created                                                │
│ { id: "campaign_123", status: "DRAFT", ... }                   │
│                                                                 │
│ Web UI shows: "Campaign created successfully"                  │
│ Enables "Start Campaign" button                                │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Data Flow: User Starts Campaign

```
┌────────────────────────────────────────────────────────────────┐
│ STEP 1: User clicks "Start Campaign"                           │
│ POST /campaigns/:id/start                                      │
└────────────────────────┬───────────────────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 2: Campaign Service (Node.js)                             │
│                                                                 │
│ async start(campaignId, tenantId) {                            │
│   const campaign = await this.findOne(campaignId, tenantId);   │
│                                                                 │
│   // Check if campaign uses workflow engine                    │
│   if (campaign.config.useWorkflowEngine) {                     │
│     // Route to .NET Workflow Service                          │
│     return this.executeViaWorkflowEngine(campaign);            │
│   }                                                             │
│                                                                 │
│   // Standard campaign execution in Node.js                    │
│   const execution = await this.createExecution(campaignId);    │
│                                                                 │
│   // Add to Bull queue for async processing                    │
│   await this.campaignQueue.add('execute-campaign', {           │
│     executionId: execution.id,                                 │
│     campaignId: campaign.id,                                   │
│     tenantId: tenantId                                          │
│   }, {                                                          │
│     delay: campaign.scheduledAt ?                              │
│            calculateDelay(campaign.scheduledAt) : 0            │
│   });                                                           │
│                                                                 │
│   return execution;                                             │
│ }                                                               │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 3: Bull Queue (Redis)                                     │
│ LPUSH campaign-executor { executionId, campaignId, tenantId }  │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 4: Campaign Executor Worker (Node.js Background Process)  │
│ apps/api/src/campaigns/jobs/campaign-executor.processor.ts     │
│                                                                 │
│ @Process('execute-campaign')                                    │
│ async handleExecution(job: Job) {                              │
│   const { executionId, campaignId, tenantId } = job.data;      │
│                                                                 │
│   const campaign = await this.campaignService.findOne(...);    │
│   const execution = await this.getExecution(executionId);      │
│                                                                 │
│   // Update status to RUNNING                                  │
│   await this.updateExecution(executionId, { status: 'RUNNING' });│
│                                                                 │
│   // Execute based on campaign type                            │
│   switch(campaign.type) {                                      │
│     case 'POST':                                                │
│       await this.executePostCampaign(campaign, execution);     │
│       break;                                                    │
│     case 'FOLLOW':                                              │
│       await this.executeFollowCampaign(campaign, execution);   │
│       break;                                                    │
│     // ...                                                      │
│   }                                                             │
│                                                                 │
│   // Update status to COMPLETED                                │
│   await this.updateExecution(executionId, {                    │
│     status: 'COMPLETED',                                        │
│     results: { success: X, failed: Y }                          │
│   });                                                           │
│                                                                 │
│   // Send notification                                          │
│   await this.notificationService.create({                      │
│     userId: campaign.userId,                                    │
│     message: `Campaign completed: ${X} success, ${Y} failed`   │
│   });                                                           │
│ }                                                               │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 5: Platform Posting (Varies by Config)                    │
│                                                                 │
│ IF campaign.config.automation.useBrowser === true:             │
│   ┌────────────────────────────────────────┐                  │
│   │ Browser Automation Path                │                  │
│   │                                         │                  │
│   │ 1. BrowserService.createSession()      │                  │
│   │ 2. Navigate to platform                │                  │
│   │ 3. Load cookies from DB                │                  │
│   │ 4. HumanBehaviorService.humanType()    │                  │
│   │ 5. Click post button                   │                  │
│   │ 6. BrowserService.closeSession()       │                  │
│   └────────────────────────────────────────┘                  │
│                                                                 │
│ ELSE (API path):                                                │
│   ┌────────────────────────────────────────┐                  │
│   │ Platform Adapter Path                  │                  │
│   │                                         │                  │
│   │ 1. Get PlatformAccount from DB         │                  │
│   │ 2. Decrypt accessToken                 │                  │
│   │ 3. Call facebookAdapter.createPost()   │                  │
│   │ 4. Handle rate limits                  │                  │
│   │ 5. Store result                        │                  │
│   └────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 Data Flow: AI Content Generation (with .NET Orchestration)

```
┌────────────────────────────────────────────────────────────────┐
│ STEP 1: User requests AI generation                            │
│ POST /ai/generate/post                                          │
│ { prompt: "Summer sale", provider: "claude", ... }             │
└────────────────────────┬───────────────────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 2: Node.js AI Controller                                  │
│ apps/api/src/ai/ai.controller.ts                               │
│                                                                 │
│ @Post('/generate/post')                                         │
│ async generatePost(@Body() dto) {                              │
│   // Feature Router: Check if provider is Claude/Local         │
│   if (dto.provider === 'claude' || dto.provider === 'local') { │
│     // Route to .NET AI Service                                │
│     return this.aiGrpcClient.generateContent({                 │
│       prompt: dto.prompt,                                       │
│       provider: dto.provider,                                   │
│       tenantId: user.tenantId,                                  │
│       userId: user.id                                           │
│     });                                                         │
│   }                                                             │
│                                                                 │
│   // OpenAI can be handled by Node.js                          │
│   return this.aiService.generatePost(dto);                     │
│ }                                                               │
└────────────────────────┬───────────────────────────────────────┘
                         │ gRPC call
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 3: .NET AI Service (gRPC Server)                          │
│ src/USAMKO.AI.Service/Services/AIService.cs                    │
│                                                                 │
│ public override async Task<GenerateContentResponse>            │
│   GenerateContent(GenerateContentRequest request, ...) {       │
│                                                                 │
│   var orchestrator = new AIOrchestrator(                       │
│     openAIProvider, claudeProvider, localLLMProvider           │
│   );                                                            │
│                                                                 │
│   // Try requested provider first                              │
│   var result = await orchestrator.GenerateContentAsync(        │
│     request.Prompt,                                             │
│     preferredProvider: request.Provider                         │
│   );                                                            │
│                                                                 │
│   // If failed, automatic failover to next provider            │
│   // OpenAI → Claude → Local LLM                               │
│                                                                 │
│   return new GenerateContentResponse {                         │
│     Content = result.Content,                                   │
│     ProviderUsed = result.Provider,                             │
│     FailoverOccurred = result.FailoverOccurred                  │
│   };                                                            │
│ }                                                               │
└────────────────────────┬───────────────────────────────────────┘
                         │ gRPC response
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 4: Node.js returns to client                              │
│ HTTP 200 OK                                                     │
│ { content: "...", provider: "claude", failover: false }        │
└────────────────────────┬───────────────────────────────────────┘
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 5: Web UI displays result                                 │
│ User sees generated content in editor                          │
│ Shows badge: "Generated by Claude AI"                          │
└─────────────────────────────────────────────────────────────────┘
```

### 8.4 Data Flow: Extension Token Capture

```
┌────────────────────────────────────────────────────────────────┐
│ STEP 1: User browses Facebook normally                         │
│ User visits facebook.com, already logged in                    │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 2: Facebook makes GraphQL request                         │
│ POST https://www.facebook.com/api/graphql/                     │
│ FormData: fb_dtsg=AQH..., doc_id=12345, variables={...}        │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 3: Chrome Extension Intercepts                            │
│ chromeExt/background.js                                         │
│                                                                 │
│ chrome.webRequest.onBeforeRequest.addListener(                 │
│   (details) => {                                                │
│     if (details.url.includes('facebook.com/api/graphql/')) {   │
│       const formData = parseFormData(details.requestBody);     │
│       if (formData.fb_dtsg) {                                   │
│         capturedTokens.fb_dtsg = formData.fb_dtsg;             │
│         capturedTokens.doc_id = formData.doc_id;               │
│         capturedTokens.__dyn = formData.__dyn;                 │
│                                                                 │
│         // Send to backend via WebSocket                       │
│         websocket.send(JSON.stringify({                        │
│           type: 'TOKEN_CAPTURE',                                │
│           payload: {                                            │
│             platform: 'facebook',                               │
│             tokens: capturedTokens,                             │
│             capturedAt: new Date().toISOString()                │
│           }                                                     │
│         }));                                                    │
│       }                                                         │
│     }                                                           │
│   },                                                            │
│   { urls: ["*://*.facebook.com/*"] },                          │
│   ["requestBody"]                                               │
│ );                                                              │
└────────────────────────┬───────────────────────────────────────┘
                         │ WebSocket (wss://)
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 4: Node.js Extension Gateway                              │
│ apps/api/src/extension/extension.gateway.ts                    │
│                                                                 │
│ @SubscribeMessage('TOKEN_CAPTURE')                             │
│ async handleTokenCapture(                                      │
│   @ConnectedSocket() client: Socket,                           │
│   @MessageBody() payload                                        │
│ ) {                                                             │
│   // Get authenticated user from socket                        │
│   const userId = client.data.userId;                           │
│   const tenantId = client.data.tenantId;                       │
│                                                                 │
│   // Find platform account                                     │
│   const account = await this.prisma.platformAccount.findFirst({│
│     where: {                                                    │
│       tenantId,                                                 │
│       userId,                                                   │
│       platform: payload.platform.toUpperCase()                  │
│     }                                                           │
│   });                                                           │
│                                                                 │
│   if (!account) {                                               │
│     return { success: false, error: 'Account not found' };     │
│   }                                                             │
│                                                                 │
│   // Encrypt tokens                                            │
│   const encrypted = await this.encryptionService.encrypt(      │
│     JSON.stringify(payload.tokens),                            │
│     tenantId                                                    │
│   );                                                            │
│                                                                 │
│   // Store in database                                         │
│   await this.prisma.platformAccount.update({                   │
│     where: { id: account.id },                                 │
│     data: {                                                     │
│       cookies: encrypted.ciphertext,                            │
│       metadata: {                                               │
│         ...account.metadata,                                    │
│         tokensCapturedAt: new Date(),                           │
│         advancedFeaturesEnabled: true                           │
│       }                                                         │
│     }                                                           │
│   });                                                           │
│                                                                 │
│   // Notify user                                                │
│   this.eventEmitter.emit('advanced-features-enabled', {        │
│     userId,                                                     │
│     platform: payload.platform                                  │
│   });                                                           │
│                                                                 │
│   return { success: true, advancedFeaturesEnabled: true };     │
│ }                                                               │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 5: PostgreSQL Update                                      │
│ UPDATE "PlatformAccount"                                        │
│ SET cookies = '...encrypted...',                                │
│     metadata = jsonb_set(metadata, '{advancedFeaturesEnabled}',│
│                          'true')                                │
│ WHERE id = 'account_id';                                        │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│ STEP 6: Web UI Notification                                    │
│ WebSocket event → Frontend                                      │
│ Toast notification: "✓ Advanced features enabled for Facebook" │
│ Platform connection page shows green badge                      │
└─────────────────────────────────────────────────────────────────┘
```

---

*[Document continues with remaining sections 9-17 in next part due to length...]*

---

## DOCUMENT STATUS

**Sections Completed:** 1-8  
**Sections Remaining:** 9-17  
**Total Pages:** Part 1 of 2  

**Next Sections:**
- 9. Authentication Architecture
- 10. Security Architecture  
- 11. Migration Plan
- 12. Regression Testing Strategy
- 13. Deployment Architecture
- 14. Feature Preservation Matrix
- 15. Service Communication Protocol Details
- 16. Monitoring & Observability
- 17. Success Criteria

**Ready for Review:** Sections 1-8 provide complete architectural foundation

---
