# Petrol Management System — Database Safety, Isolation & Backup Guide

This document is the official database reliability manual for the **Petrol Management System**. It documents the root cause of the data-loss incident, the permanent architectural safeguards implemented, the isolated test environment, safe backup/restore procedures (`mongodump`/`mongorestore`), and pre-migration checklists.

---

## 1. Incident Investigation & Root Cause Report

### Incident Description
During automated development and AI refactoring tasks, developers experienced sudden data disappearance: accounts, petrol pump configurations, customer links, and transaction ledgers were being cleared or rendered inaccessible.

### Root Cause Analysis (Evidence-Based)

#### Root Cause #1: Test Suite Destructive Wipe Against Normal Development Database
- **Responsible File**: `backend/tests/helpers/db.js`
- **Responsible Function**: `connectTestDB()` & `clearDB()`
- **Mechanism**:
  - `connectTestDB()` was configured to resolve URI as:
    ```javascript
    const uri = process.env.MONGO_URI_TEST || process.env.MONGO_URI || config.mongo.uri;
    ```
  - In `backend/.env`, only `MONGO_URI=mongodb://localhost:27017/petro_dealer` was defined. `MONGO_URI_TEST` was missing.
  - When tests ran (`npm test`, `npm run test:integration`, mocha), `NODE_ENV` remained `development` (loaded from `.env`) and `uri` fell back directly to `mongodb://localhost:27017/petro_dealer`.
  - In `clearDB()`, which ran in `before()`, `beforeEach()`, and `after()` of every test suite:
    ```javascript
    for (const key of keys) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    ```
  - **Result**: Every execution of the test suite completely wiped every collection in the development database.

#### Root Cause #2: Database Drift & Multi-Database Confusion
- **Evidence Found on MongoDB Server**:
  - An earlier database `test` contained 3 user accounts (`Abdul Baseer`, `luqman`, `admin@petrodealer.pk`) created when earlier scripts connected without specifying an explicit database name in the URI (`mongodb://localhost:27017` defaults to `test`).
  - An earlier database `petrodealer` (without underscore) contained 2 admin users (`secondadmin@petrodealer.com`).
  - The active backend `.env` was pointing to `petro_dealer` (with underscore).
  - An older test DB `petro_test` was created during prior experiments.
- **Result**: Applications or scripts switching between connection strings looked at different databases. When viewing `petro_dealer`, data located in `test` or `petrodealer` appeared "lost".
- **Aggravating Factor**: Startup logs did not display the connected database name, making silent database switches undetectable.

#### Root Cause #3: Mongoose Index Collision on Role Field
- **Responsible File**: `backend/src/models/User.js`
- **Mechanism**: Both `{ role: 1 }` and `{ role: 1 }, { unique: true, partialFilterExpression: { role: 'super_admin' } }` were defined without an explicit index name. Both defaulted to the index name `"role_1"`, triggering MongoDB `MongoServerError: An existing index has the same name as the requested index`.
- **Result**: Caused index creation failures and Mongoose schema warnings during migrations.

---

## 2. Permanent Architectural Fixes

### 1. Central Database Safety Utility (`backend/src/utils/dbSafety.js`)
- `assertTestDatabase(connectionOrUri)`: Guarantees that destructive test operations can ONLY run if:
  1. `NODE_ENV === 'test'`
  2. The connected database name explicitly includes `"test"` (e.g. `petro_dealer_test`)
  3. The database name is NOT `production`, `live`, `petro_dealer`, `petrodealer`, or `petrol_management`.
- `assertDestructiveOperationAllowed(connection, operationName)`:
  - In `production`: permanently disabled and strictly throws.
  - In `development`: permanently disabled unless explicit `ALLOW_DESTRUCTIVE_DEV_OPS=true` is supplied.
  - In `test`: strictly verifies `assertTestDatabase(connection)`.
- `getSafeDbDiagnostics(connection)`: Extracts sanitized database name, host, port, environment, and readiness without leaking credentials.

### 2. Strict Environment Separation (`backend/src/config/index.js`)
- **Development**: Uses `MONGO_URI_DEVELOPMENT` or `MONGO_URI` (fails fast if missing). Rejects test URIs.
- **Test**: Strictly uses `MONGO_URI_TEST` or defaults to `mongodb://localhost:27017/petro_dealer_test`. Tests can NEVER touch `petro_dealer`.
- **Production**: Requires `MONGO_URI_PRODUCTION` or `MONGO_URI`. Rejects any URI containing `"test"` or localhost fallbacks.

### 3. Automatic Test Pre-Loader (`backend/tests/helpers/testEnv.js`)
- Pre-loaded via Mocha `-r tests/helpers/testEnv.js` on every test run (`npm test`, `npm run test:unit`, `npm run test:integration`).
- Automatically sets `NODE_ENV=test` and redirects `process.env.MONGO_URI = process.env.MONGO_URI_TEST`.
- Pre-validates that the test URI contains `"test"`.

### 4. Safe Startup Diagnostics (`backend/src/server.js` & `backend/src/config/database.js`)
- Logs the connected database name clearly on startup:
  `Database connected | Environment: development | Database: petro_dealer`
- Never logs usernames, passwords, or connection strings.
- Health endpoint (`GET /health`) safely includes `database` and `dbStatus`.

### 5. Safe Migration Engine with `--dry-run` (`backend/src/scripts/migrateMultiTenant.js`)
- **Dry-Run Mode**: `npm run db:migrate:dry` previews all planned creations and updates without modifying a single document.
- **Migration History Tracking**: Audited in `MigrationHistory` collection (`2026-05-18_multi_tenant_v1`). Rerunning the migration is idempotent and exits safely.
- **Additive Index Creation**: Replaced destructive `syncIndexes()` with safe `createIndexes()`.

### 6. Safe Super Admin Seeding (`backend/src/scripts/seedSuperAdmin.js`)
- Completely idempotent. Looks up existing Super Admin by email and updates or creates.
- Never executes `deleteMany` or wipes accounts.

---

## 3. Database Commands Reference

| Command | Action | Safety Level |
|---|---|---|
| `npm run db:diagnose` | Safely inspects DB name, state, and document counts | 100% Safe (Read-only) |
| `npm run db:migrate:dry` | Evaluates migration and prints dry-run report | 100% Safe (Read-only) |
| `npm run db:migrate` | Executes multi-tenant migration with audit tracking | Additive & Idempotent |
| `npm run seed:superadmin` | Seeds/updates default Super Admin | Idempotent (No deletions) |
| `npm test` | Runs 239 unit & integration tests against `petro_dealer_test` | Strictly Isolated (Dev DB protected) |
| `npm run test:unit` | Runs 131 unit tests | Strictly Isolated |
| `npm run test:integration` | Runs 108 integration tests | Strictly Isolated |

---

## 4. Safe Backup & Restore Procedures (mongodump / mongorestore)

Before any schema migration or major deployment, always perform an explicit backup.

### A. Local MongoDB Backup

1. **Create timestamped backup directory**:
   ```powershell
   $TIMESTAMP = Get-Date -Format "yyyyMMdd_HHmmss"
   mongodump --db petro_dealer --out "backups/backup_$TIMESTAMP"
   ```

2. **Verify backup files exist**:
   ```powershell
   Get-ChildItem "backups/backup_$TIMESTAMP/petro_dealer"
   ```

3. **Restore from backup (disaster recovery only)**:
   ```powershell
   mongorestore --db petro_dealer --drop "backups/backup_$TIMESTAMP/petro_dealer"
   ```

### B. MongoDB Atlas Cloud Backup

Do NOT put passwords or URIs in plain shell scripts. Use environment variables:

1. **Dump Atlas database safely**:
   ```bash
   mongodump --uri="$MONGO_URI" --out="backups/atlas_backup_$(date +%Y%m%d_%H%M%S)"
   ```

2. **Restore Atlas database**:
   ```bash
   mongorestore --uri="$TARGET_MONGO_URI" "backups/atlas_backup_<timestamp>/<db_name>"
   ```

---

## 5. Pre-Migration Checklist

Before executing any database migration:

- [ ] 1. Run `npm run db:diagnose` and record existing document counts.
- [ ] 2. Create an explicit backup using `mongodump`.
- [ ] 3. Run migration in dry-run mode: `npm run db:migrate:dry`.
- [ ] 4. Review dry-run report for planned changes and unmapped records.
- [ ] 5. Run live migration: `npm run db:migrate`.
- [ ] 6. Run `npm run db:diagnose` and verify record counts match expectations.
- [ ] 7. Verify audit entry in `MigrationHistory` collection.
