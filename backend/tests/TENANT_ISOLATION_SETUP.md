# Tenant Isolation Tests - Setup Instructions

## Prerequisites

The tenant isolation tests require a test database to run. You have two options:

### Option 1: SQLite (Fastest - Recommended for Local Testing)

No additional setup needed. Tests will use an in-memory SQLite database.

**Run tests:**
```bash
cd backend
NODE_ENV=test npm test -- tenant-isolation.test.js
```

### Option 2: PostgreSQL (Production-Like Environment)

Set up a test PostgreSQL database:

```bash
# Create test database
createdb infershield_test

# Set environment variable
export DATABASE_URL="postgresql://postgres:password@localhost:5432/infershield_test"
export NODE_ENV=test

# Run migrations
npx knex migrate:latest

# Run tests
npm test -- tenant-isolation.test.js
```

## Current Status

⚠️ **Tests have not been run yet due to test environment setup requirements.**

The test file `backend/tests/tenant-isolation.test.js` is complete and ready to run once the database is configured.

## What the Tests Validate

1. **Cross-tenant data isolation** - Users cannot access each other's data
2. **API key isolation** - Users cannot access, revoke, or view other users' API keys  
3. **Usage record isolation** - Users cannot manipulate other users' usage data
4. **Audit log isolation** - Users cannot view other users' threat logs
5. **tenantQuery middleware** - Automatic user_id scoping works correctly
6. **Webhook safety** - Webhook handlers correctly lookup users by stripe_customer_id

## Integration into CI

Once tests pass locally, add to GitHub Actions:

```yaml
# .github/workflows/test.yml
- name: Run tenant isolation tests
  env:
    DATABASE_URL: postgresql://postgres:postgres@localhost:5432/infershield_test
    NODE_ENV: test
  run: |
    cd backend
    npx knex migrate:latest
    npm test -- tenant-isolation.test.js
```

## Expected Result

All 10 test cases should pass:

```
PASS tests/tenant-isolation.test.js
  Tenant Isolation
    Audit Logs Isolation
      ✓ User A cannot read User B audit logs
      ✓ tenantQuery automatically scopes audit log queries
    API Keys Isolation
      ✓ User A cannot access User B API keys
      ✓ User A cannot revoke User B API key
      ✓ User A cannot get details of User B API key
    Usage Records Isolation
      ✓ User A cannot update User B usage records
      ✓ User A cannot see User B usage data
    Policies Isolation (when database-backed)
      ✓ User A cannot delete User B policies
    Webhook Handler Cross-Tenant Safety
      ✓ Webhook handler correctly identifies user by stripe_customer_id
    tenantQuery Middleware Safety
      ✓ tenantQuery throws if userId is undefined

Test Suites: 1 passed, 1 total
Tests:       10 passed, 10 total
```

## Troubleshooting

**Error: "Cannot read properties of undefined (reading 'client')"**
- Cause: `NODE_ENV=test` not set, or test config missing from knexfile.js
- Fix: Ensure `NODE_ENV=test` is set before running tests

**Error: "Database connection failed"**
- Cause: DATABASE_URL not set or database doesn't exist
- Fix: Create test database or use SQLite (no setup needed)

**Error: "Table 'users' doesn't exist"**
- Cause: Migrations haven't been run on test database
- Fix: Run `npx knex migrate:latest` before tests
