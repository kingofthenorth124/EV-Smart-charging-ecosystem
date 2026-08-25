## Frontend–Backend Data Parity

The frontend must fully understand and represent **all data that the backend exposes**.

Do not arbitrarily omit, simplify, rename, transform, or discard backend fields.

The backend is the source of truth for the application's data model, and the frontend must have a corresponding TypeScript representation of that model.

### Requirements

- Every backend entity exposed through the API must have a corresponding frontend TypeScript type.
- Every field returned by the backend should be represented in the frontend contract.
- Nested objects, arrays, relationships, metadata, status fields, timestamps, IDs, pagination information, and other response properties must be preserved.
- Do not create a reduced frontend version of a backend object unless there is a deliberate UI-specific view model.
- If the backend adds a field, the shared TypeScript contract and frontend should be updated accordingly.
- If the backend changes a field's type, nullability, enum, or structure, the frontend must be updated at the same time.
- Never use `any` to bypass a backend/frontend type mismatch.
- Never silently ignore backend fields because they are not currently displayed in the UI.

### Single Source of Truth

Use shared TypeScript types and schemas between the frontend and backend.

The data flow should be:

```text
Database
   ↓
Backend Domain Model
   ↓
API Contract / Shared TypeScript Schema
   ↓
Frontend API Client
   ↓
Frontend State
   ↓
UI Components
```

The frontend should consume the API according to the exact shared contract.

### No Silent Data Loss

If the backend returns:

```ts
{
  (id, name, email, status, createdAt, updatedAt, metadata, permissions);
}
```

the frontend should understand **all of these fields**, even if a particular screen only displays `name` and `status`.

Do not change this into:

```ts
{
  (name, status);
}
```

unless that reduction is explicitly intentional and documented as a UI-specific projection.

### Keep Both Sides in Synchronization

Whenever implementing a feature, work across the entire stack rather than treating frontend and backend as separate projects.

Before declaring a feature complete, verify:

**Backend data → API response → shared TypeScript contract → frontend API client → frontend state → UI**

There must be no undocumented mismatch between what the backend provides and what the frontend understands.

The goal is **complete data parity and contract synchronization between frontend and backend**.
