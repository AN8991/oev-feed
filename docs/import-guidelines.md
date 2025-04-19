# Import Path Guidelines for OEV Feed

This document outlines the standardized approach to imports in the OEV Feed codebase following hexagonal architecture principles.

## Path Aliases (No Barrel Files)

We use TypeScript path aliases for clear, maintainable imports that reflect the hexagonal architecture layer boundaries. **Barrel files (index.ts) are no longer used.**

### Examples

```typescript
// Domain layer import
import { DatabaseService } from '@domain/services/database/database.service';

// Infrastructure layer import
import { logger } from '@infrastructure/utils/structured-logger';
```

- Use `@domain/*`, `@application/*`, `@adapters/*`, `@infrastructure/*`, and `@shared/*` to indicate the architectural layer.
- Do not use relative imports like `../../` except for local, intra-module files.
- Do not use barrel files (index.ts) for imports—always import from the concrete file.

## Layer Boundaries

Respect the following dependencies rules according to hexagonal architecture:

1. **Domain Layer** (`@domain/*`):
   - Can only import from within the domain layer or from shared
   - CANNOT import from application, adapters, or infrastructure

2. **Application Layer** (`@application/*`):
   - Can import from domain and shared
   - CANNOT import from adapters or infrastructure

3. **Adapters Layer** (`@adapters/*`):
   - Can import from domain, application, and shared
   - Should minimize infrastructure imports (only when necessary)

4. **Infrastructure Layer** (`@infrastructure/*`):
   - Can import from domain, application, and shared
   - Should NOT contain business logic

5. **Shared Layer** (`@shared/*`):
   - Cannot import from any other layer
   - Should be pure, reusable utilities and types

## Examples

### Before:

```typescript
import { PositionModel } from '../../../domain/models/position.model';
import { logger, LogCategory } from '../../../utils/structured-logger';
import { normalizeAddress } from '../../../utils/address-utils';
```

### After:

```typescript
import { PositionModel } from '@domain/models/position.model';
import { logger, LogCategory } from '@infrastructure/utils/structured-logger';
import { normalizeAddress } from '@domain/utils/address-utils';
```

## Migration Strategy

When updating existing files:

1. First, update your imports to use the new path aliases
2. Ensure you respect the layer boundary rules
3. Always import from the concrete file using path aliases
4. Run tests to verify everything still works

## Tools Support

This path aliasing is supported by:
- TypeScript compiler
- VS Code (with proper tsconfig.json)
- Jest (with moduleNameMapper configuration)

## Running TypeScript Scripts with Path Aliases

When running scripts that use TypeScript path aliases (e.g., `@domain/*`, `@infrastructure/*`), you must instruct `ts-node` to resolve these aliases using `tsconfig-paths/register`.

**Use this command pattern:**

```sh
npx ts-node -r tsconfig-paths/register scripts/your-script.ts
```

**Example:**

```sh
npx ts-node -r tsconfig-paths/register scripts/test-config.ts
```

This ensures all path aliases are resolved as defined in your `tsconfig.json`.

> **Note:** If you forget this flag, you will get `MODULE_NOT_FOUND` errors for any path alias imports.
