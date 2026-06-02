# Identity Model Decision

Last updated: 2026-06-02

## Decision

The official target identity model for a full public SaaS is:

```text
app-native authentication + workspaces + role-based membership
```

Trusted auth headers remain supported only as:

- an interim private/B2B deployment bridge,
- a compatibility layer for deployments sitting behind a trusted auth gateway,
- the current ownership mechanism for uploaded documents until app-native
  accounts and workspaces are implemented.

Session-scoped ownership remains local/private-demo only. It is not a public
multi-user SaaS identity model.

## Why App-Native Auth Is The Public SaaS Target

The product stores and retrieves sensitive research context:

- generated brief topics,
- selected papers and evidence snippets,
- uploaded documents and chunks,
- document Q&A,
- claim-comparison inputs and reports,
- future saved topics, reports, exports, and collections.

A public SaaS needs a stable internal identity graph so every private object can
be scoped to a user and workspace without relying on browser-session cookies or
deployment-specific headers.

## Target Schema

Status: implemented in Prisma on 2026-06-02 through
`prisma/migrations/20260602193000_add_app_identity/migration.sql`.

The identity foundation now includes these durable records:

```text
User
  id
  email
  name
  createdAt
  updatedAt

Workspace
  id
  name
  ownerId
  createdAt
  updatedAt

WorkspaceMember
  id
  workspaceId
  userId
  role: owner | admin | member | viewer
  createdAt
  updatedAt
```

After that, private product records should gain ownership fields:

```text
Brief
  ownerId
  workspaceId
  createdByUserId
  visibility: private | workspace | public

BriefGenerationJob
  ownerId
  workspaceId
  createdByUserId

UserDocument
  ownerId
  workspaceId
  uploadedByUserId

CompareReport
  ownerId
  workspaceId
  createdByUserId
  visibility
```

## Supported Modes

### Full Public SaaS

Required:

- app-native user accounts,
- workspace membership,
- roles,
- ownership checks on every private API,
- per-user/per-workspace rate limits,
- durable audit and retention policy.

### Private/B2B Trusted Gateway

Allowed as an interim mode when all of these are true:

- the deployment sits behind trusted infrastructure,
- `X-AI-Brief-User-Id` and `X-AI-Brief-Workspace-Id` are injected server-side,
- browsers cannot choose or override these headers,
- `DOCUMENT_AUTH_REQUIRED=true` is enabled for document routes,
- the deployment owner accepts that this is not the final app-native SaaS model.

### Local/Internal Demo

Allowed:

- session-scoped brief history,
- session-scoped document uploads,
- memory storage and memory rate limits when explicitly accepted.

Not allowed for public SaaS:

- public session-scoped document uploads,
- global public brief history,
- browser-controlled trusted headers,
- private object access by bare object ID without owner/workspace checks.

## Immediate Implementation Consequences

1. [x] Add `User`, `Workspace`, and `WorkspaceMember` to Prisma.
2. [ ] Add workspace/user ownership to `Brief` and `BriefGenerationJob`.
3. [ ] Keep existing session ownership as demo fallback or migration bridge.
4. [ ] Extend route access checks from session-only to user/workspace-aware.
5. [ ] Move rate limiting from per-IP to per-user/per-workspace when identity exists.
6. [ ] Add cross-user and cross-workspace tests for brief list, brief detail,
   export, brief Q&A, job polling, documents, and saved compare reports.

## Acceptance Rule

The identity model decision is complete when:

- this document exists,
- `docs/DROGA_DO_PELNEGO_SAAS.md` marks the decision point done,
- `STATUS.md`, `TODO.md`, `README.md`, and deployment docs point to this
  decision,
- the next implementation task is the app-native user/workspace schema.
