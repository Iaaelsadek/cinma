# Requirements Document

## Introduction

إكمال نقل جدول `server_provider_configs` من Supabase إلى CockroachDB بشكل نهائي وصحيح. هذا الجدول يحتوي على إعدادات السيرفرات (content configuration data) ويجب أن يكون في CockroachDB حسب قواعد المشروع: Supabase = Auth & User Data ONLY, CockroachDB = ALL Content.

تم بالفعل إنشاء API routes في `/api/server-configs` وتحديث `ServerTester.tsx`. المتبقي هو تحديث `useServers.ts` hook وصفحة `backup.tsx` واختبار شامل قبل حذف الجدول من Supabase نهائياً.

## Glossary

- **Server_Configs_Hook**: The React hook `useServers.ts` that manages server provider configurations
- **Backup_Page**: The admin backup page at `src/pages/admin/backup.tsx`
- **Server_Configs_API**: The CockroachDB API endpoint at `/api/server-configs`
- **Supabase_Table**: The legacy `server_provider_configs` table in Supabase database
- **CockroachDB_Table**: The migrated `server_provider_configs` table in CockroachDB database
- **Watch_Page**: The video watch page that uses server configurations
- **Server_Tester**: The admin page for testing server configurations

## Requirements

### Requirement 1: Update useServers Hook to Use CockroachDB API

**User Story:** As a developer, I want the useServers hook to fetch server configurations from CockroachDB API, so that the application follows the correct database architecture.

#### Acceptance Criteria

1. THE Server_Configs_Hook SHALL fetch server configurations from Server_Configs_API instead of Supabase_Table
2. WHEN Server_Configs_API returns configurations, THE Server_Configs_Hook SHALL use them to generate server URLs
3. WHEN Server_Configs_API fails or returns empty data, THE Server_Configs_Hook SHALL fallback to SERVER_PROVIDERS constant
4. THE Server_Configs_Hook SHALL maintain all existing functionality including filtering, sorting, and download server identification
5. THE Server_Configs_Hook SHALL handle loading states during API fetch operations
6. THE Server_Configs_Hook SHALL cache API responses appropriately to avoid unnecessary requests

### Requirement 2: Update Backup Page to Exclude Supabase Server Configs

**User Story:** As an admin, I want the backup page to correctly handle server_provider_configs from CockroachDB, so that backups reflect the correct database architecture.

#### Acceptance Criteria

1. THE Backup_Page SHALL remove `server_provider_configs` from the Supabase tables list
2. WHEN exporting backup, THE Backup_Page SHALL NOT attempt to export `server_provider_configs` from Supabase
3. WHEN importing backup, THE Backup_Page SHALL NOT attempt to import `server_provider_configs` to Supabase
4. THE Backup_Page SHALL display accurate table counts excluding `server_provider_configs`
5. WHERE backup includes CockroachDB tables, THE Backup_Page SHALL provide clear indication that some tables are in different databases

### Requirement 3: Comprehensive Application Testing

**User Story:** As a developer, I want to test all server configuration functionality, so that I can verify the migration is complete and working correctly.

#### Acceptance Criteria

1. WHEN Watch_Page loads, THE application SHALL successfully fetch and display server configurations from CockroachDB_Table
2. WHEN user switches between servers on Watch_Page, THE application SHALL load correct server URLs from CockroachDB_Table
3. WHEN Server_Tester page loads, THE application SHALL display all server configurations from CockroachDB_Table
4. WHEN admin modifies server configurations via Server_Tester, THE changes SHALL persist to CockroachDB_Table
5. THE application SHALL NOT make any queries to Supabase_Table for server configurations
6. WHEN server reporting occurs, THE link_checks table SHALL receive correct provider_id references from CockroachDB_Table

### Requirement 4: Safe Supabase Table Deletion

**User Story:** As a developer, I want to safely delete the server_provider_configs table from Supabase, so that the migration is finalized and the architecture is clean.

#### Acceptance Criteria

1. WHEN all tests pass, THE developer SHALL create a final backup of Supabase_Table data
2. THE developer SHALL verify NO code references Supabase_Table before deletion
3. THE developer SHALL execute SQL command to drop Supabase_Table
4. WHEN Supabase_Table is deleted, THE application SHALL continue functioning normally
5. THE developer SHALL document the deletion with timestamp and confirmation in migration log

### Requirement 5: Code Quality and Documentation

**User Story:** As a developer, I want clean, well-documented code with zero temporary solutions, so that the codebase remains maintainable.

#### Acceptance Criteria

1. THE Server_Configs_Hook SHALL contain NO commented-out Supabase code
2. THE Server_Configs_Hook SHALL include clear comments explaining API integration
3. THE Backup_Page SHALL contain NO references to `server_provider_configs` in Supabase context
4. THE codebase SHALL contain NO temporary workarounds or bypass logic
5. WHERE error handling exists, THE code SHALL handle errors properly with appropriate fallbacks
6. THE migration SHALL be documented in a completion report with verification steps

