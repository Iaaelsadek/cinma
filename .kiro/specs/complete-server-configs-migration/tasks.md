# Implementation Plan: Complete Server Configs Migration

## Overview

إكمال نقل جدول `server_provider_configs` من Supabase إلى CockroachDB بتحديث `useServers.ts` hook وصفحة `backup.tsx` واختبار شامل قبل حذف الجدول من Supabase نهائياً.

## Tasks

- [ ] 1. Update useServers hook to use CockroachDB API
  - [ ] 1.1 Replace Supabase query with fetch to `/api/server-configs`
    - Remove `supabase.from('server_provider_configs')` calls
    - Implement `fetch()` call to `/api/server-configs` endpoint
    - Add loading state management (set true before fetch, false after)
    - _Requirements: 1.1, 1.5_
  
  - [ ] 1.2 Implement API response handling and data transformation
    - Parse JSON response from API
    - Transform API data to match existing Server type interface
    - Maintain priority sorting (ascending order)
    - Filter out inactive servers (`is_active: false`)
    - Identify download servers (`is_download: true`)
    - _Requirements: 1.2, 1.4_
  
  - [ ] 1.3 Add error handling with fallback to SERVER_PROVIDERS
    - Wrap fetch in try-catch block
    - Handle network errors, timeouts, and invalid responses
    - Fallback to SERVER_PROVIDERS constant on any error
    - Log errors to console for debugging
    - _Requirements: 1.3, 5.5_
  
  - [ ]* 1.4 Write property test for API configuration usage
    - **Property 1: API Configuration Usage**
    - **Validates: Requirements 1.2**
    - Test that hook correctly generates server URLs from API configurations
    - Use fast-check with 100 iterations
  
  - [ ]* 1.5 Write property test for fallback behavior
    - **Property 2: Fallback on API Failure**
    - **Validates: Requirements 1.3**
    - Test that hook falls back to SERVER_PROVIDERS on API errors
    - Test various error scenarios (404, 500, network error, empty response)
  
  - [ ]* 1.6 Write property test for functionality preservation
    - **Property 3: Functionality Preservation**
    - **Validates: Requirements 1.4**
    - Test that filtering, sorting, and download server identification work correctly
    - Verify behavior matches original Supabase implementation

- [ ] 2. Checkpoint - Verify useServers hook changes
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Update backup page to exclude server_provider_configs
  - [ ] 3.1 Remove server_provider_configs from TABLES array
    - Delete `'server_provider_configs'` entry from TABLES constant
    - Update table count display if needed
    - _Requirements: 2.1, 2.4_
  
  - [ ] 3.2 Add UI indication for CockroachDB tables
    - Add note or badge indicating some tables are in CockroachDB
    - Update backup page documentation/help text
    - _Requirements: 2.5_
  
  - [ ]* 3.3 Write unit test for backup page table list
    - Test that TABLES array doesn't include 'server_provider_configs'
    - Test that export doesn't attempt to fetch from Supabase
    - _Requirements: 2.2, 2.3_

- [ ] 4. Comprehensive integration testing
  - [ ] 4.1 Test Watch Page server loading and switching
    - Navigate to watch page for test movie (TMDB ID 550)
    - Verify servers load from CockroachDB API
    - Switch between servers and verify URLs are correct
    - Test with TV show (TMDB ID 1399, S1E1)
    - _Requirements: 3.1, 3.2_
  
  - [ ] 4.2 Test ServerTester admin functionality
    - Load ServerTester page
    - Verify all configurations display from CockroachDB
    - Add a new test configuration
    - Modify existing configuration
    - Delete test configuration
    - Reload page and verify changes persisted
    - _Requirements: 3.3, 3.4_
  
  - [ ] 4.3 Test server reporting with CockroachDB provider IDs
    - Report a broken server from watch page
    - Verify link_checks entry created with correct provider_id
    - Verify provider_id references valid CockroachDB configuration
    - _Requirements: 3.6_
  
  - [ ]* 4.4 Write property test for loading state management
    - **Property 4: Loading State Management**
    - **Validates: Requirements 1.5**
    - Test loading state transitions during API fetch
  
  - [ ]* 4.5 Write property test for server switching correctness
    - **Property 6: Server Switching Correctness**
    - **Validates: Requirements 3.2**
    - Test that server URLs match CockroachDB configurations
  
  - [ ]* 4.6 Write property test for configuration persistence
    - **Property 7: Configuration Persistence Round-Trip**
    - **Validates: Requirements 3.4**
    - Test save and fetch operations maintain data integrity
  
  - [ ]* 4.7 Write property test for referential integrity in reporting
    - **Property 8: Referential Integrity in Reporting**
    - **Validates: Requirements 3.6**
    - Test that reported provider_ids exist in CockroachDB

- [ ] 5. Checkpoint - Verify all functionality works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Code cleanup and verification
  - [ ] 6.1 Search and remove all Supabase references to server_provider_configs
    - Run grep search: `grep -r "server_provider_configs" src/`
    - Run grep search: `grep -r "from('server_provider_configs')" src/`
    - Remove any remaining references found
    - _Requirements: 4.2, 5.1_
  
  - [ ] 6.2 Add documentation and comments
    - Add clear comments in useServers.ts explaining API integration
    - Document error handling and fallback behavior
    - Update any relevant README or documentation files
    - _Requirements: 5.2, 5.3_
  
  - [ ] 6.3 Verify no temporary workarounds exist
    - Check for commented-out code
    - Check for TODO or FIXME comments
    - Ensure all error handling is proper and complete
    - _Requirements: 5.4, 5.5_

- [ ] 7. Safe Supabase table deletion preparation
  - [ ] 7.1 Create final backup of Supabase server_provider_configs
    - Export current data from Supabase table
    - Save backup with timestamp
    - Verify backup file is complete and valid
    - _Requirements: 4.1_
  
  - [ ] 7.2 Final verification before deletion
    - Run all tests one more time
    - Manually test all server-related functionality
    - Verify no console errors
    - Check network tab for no Supabase queries to server_provider_configs
    - _Requirements: 4.2, 4.4_
  
  - [ ] 7.3 Execute Supabase table deletion
    - Connect to Supabase database
    - Execute: `DROP TABLE server_provider_configs;`
    - Document deletion with timestamp
    - _Requirements: 4.3_
  
  - [ ] 7.4 Post-deletion verification
    - Test application thoroughly
    - Verify no errors occur
    - Verify all functionality works normally
    - Create completion report
    - _Requirements: 4.4, 5.6_

- [ ] 8. Final checkpoint - Migration complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster completion
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties using fast-check
- Integration tests ensure end-to-end functionality works correctly
- Safe deletion process ensures no data loss or application breakage
- All code changes follow database architecture rules: Supabase = Auth Only, CockroachDB = Content
