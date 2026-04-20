# Design Document: Complete Server Configs Migration

## Overview

هذا المستند يصف التصميم الفني لإكمال نقل جدول `server_provider_configs` من Supabase إلى CockroachDB. الهدف هو ضمان أن جميع أجزاء التطبيق تستخدم CockroachDB كمصدر وحيد لبيانات إعدادات السيرفرات، مع الحفاظ على جميع الوظائف الحالية وإزالة أي اعتماد على Supabase لهذا الجدول.

### Background

تم بالفعل إنشاء API endpoints في `/api/server-configs` وتحديث صفحة `ServerTester.tsx` لاستخدام CockroachDB. المتبقي هو:
- تحديث `useServers.ts` hook لاستخدام CockroachDB API
- تحديث صفحة `backup.tsx` لإزالة `server_provider_configs` من قائمة جداول Supabase
- اختبار شامل للتطبيق
- حذف الجدول من Supabase بشكل نهائي

### Goals

1. نقل كامل لجميع عمليات قراءة/كتابة server configurations إلى CockroachDB
2. الحفاظ على جميع الوظائف الحالية بدون تغيير في السلوك
3. إزالة جميع الاعتماديات على Supabase لهذا الجدول
4. ضمان استقرار التطبيق بعد الحذف النهائي للجدول من Supabase

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Application                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐      ┌──────────────┐   ┌─────────────┐ │
│  │  Watch Page  │      │ ServerTester │   │ Backup Page │ │
│  └──────┬───────┘      └──────┬───────┘   └──────┬──────┘ │
│         │                     │                   │         │
│         └─────────┬───────────┘                   │         │
│                   │                               │         │
│            ┌──────▼────────┐                      │         │
│            │ useServers.ts │                      │         │
│            │     Hook      │                      │         │
│            └──────┬────────┘                      │         │
│                   │                               │         │
└───────────────────┼───────────────────────────────┼─────────┘
                    │                               │
                    │ HTTP GET                      │ (no access)
                    │ /api/server-configs           │
                    │                               │
         ┌──────────▼───────────────────────────────▼──────────┐
         │              Backend API Server                     │
         ├─────────────────────────────────────────────────────┤
         │                                                      │
         │  ┌────────────────────────────────────────────┐    │
         │  │  /api/server-configs Routes                │    │
         │  │  - GET    /                                │    │
         │  │  - POST   /                                │    │
         │  │  - PUT    /:id                             │    │
         │  │  - DELETE /:id                             │    │
         │  │  - POST   /bulk-upsert                     │    │
         │  └────────────────┬───────────────────────────┘    │
         │                   │                                 │
         └───────────────────┼─────────────────────────────────┘
                             │
                             │ SQL Queries
                             │
              ┌──────────────▼──────────────┐
              │      CockroachDB            │
              │  server_provider_configs    │
              └─────────────────────────────┘
```

### Data Flow

1. **Frontend Request**: Component يطلب server configurations
2. **Hook Layer**: `useServers.ts` يستدعي `/api/server-configs`
3. **API Layer**: Express route يستعلم من CockroachDB
4. **Database**: CockroachDB يرجع البيانات
5. **Response**: البيانات تعود عبر نفس المسار إلى Frontend

### Migration Strategy

- **Phase 1** (مكتمل): إنشاء API endpoints و تحديث ServerTester
- **Phase 2** (هذا التصميم): تحديث useServers hook و backup page
- **Phase 3**: اختبار شامل
- **Phase 4**: حذف الجدول من Supabase

## Components and Interfaces

### 1. useServers Hook

**Location**: `src/hooks/useServers.ts`

**Current State**: يستخدم Supabase client مباشرة
```typescript
const { data, error } = await supabase
  .from('server_provider_configs')
  .select('*')
  .order('priority', { ascending: true })
```

**Target State**: يستخدم CockroachDB API
```typescript
const response = await fetch(`${API_BASE}/api/server-configs`)
const data = await response.json()
```

**Interface**:
```typescript
interface UseServersHook {
  // Input parameters
  tmdbId: number
  type: 'movie' | 'tv'
  season?: number
  episode?: number
  imdbId?: string
  
  // Return values
  servers: Server[]
  downloadServers: Server[]
  activeServer: Server | undefined
  setActiveServer: (index: number) => void
  active: number
  setActive: (index: number) => void
  loading: boolean
  reportServer: () => Promise<void>
  reportBroken: () => Promise<void>
  reporting: boolean
  checkBatchAvailability: (items: Array<{s: number; e: number}>) => Promise<Record<string, boolean>>
}
```

**Key Changes**:
- Replace `supabase.from('server_provider_configs')` with `fetch('/api/server-configs')`
- Add error handling with fallback to `SERVER_PROVIDERS` constant
- Add loading state management during API fetch
- Maintain all existing functionality (filtering, sorting, download server identification)

### 2. Backup Page

**Location**: `src/pages/admin/backup.tsx`

**Current State**: يتضمن `server_provider_configs` في قائمة TABLES
```typescript
const TABLES = [
  'movies', 'tv_series', 'seasons', 'episodes',
  'profiles', 'ads', 'settings', 'history',
  'watchlist', 'continue_watching',
  'server_provider_configs', // ← يجب إزالته
  'link_checks'
]
```

**Target State**: إزالة `server_provider_configs` من القائمة
```typescript
const TABLES = [
  'movies', 'tv_series', 'seasons', 'episodes',
  'profiles', 'ads', 'settings', 'history',
  'watchlist', 'continue_watching',
  'link_checks'
]
```

**Additional Changes**:
- تحديث UI لعرض ملاحظة أن بعض الجداول في CockroachDB
- التأكد من عدم محاولة export/import هذا الجدول من/إلى Supabase

### 3. Server Configs API (Already Implemented)

**Location**: `server/routes/server-configs.js`

**Endpoints**:
- `GET /api/server-configs` - Get all configurations
- `POST /api/server-configs` - Create new configuration
- `PUT /api/server-configs/:id` - Update configuration
- `DELETE /api/server-configs/:id` - Delete configuration
- `POST /api/server-configs/bulk-upsert` - Bulk upsert configurations

**Database Schema**:
```sql
CREATE TABLE server_provider_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base TEXT NOT NULL,
  movie_template TEXT,
  tv_template TEXT,
  is_active BOOLEAN DEFAULT true,
  supports_movie BOOLEAN DEFAULT true,
  supports_tv BOOLEAN DEFAULT true,
  is_download BOOLEAN DEFAULT false,
  priority INTEGER DEFAULT 0,
  locked_subtitle_lang TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

## Data Models

### ServerProvider Type

```typescript
type ServerProvider = {
  id: string                      // Unique identifier
  name: string                    // Display name
  base: string                    // Base URL
  movie_template?: string | null  // URL template for movies
  tv_template?: string | null     // URL template for TV shows
  is_active?: boolean             // Whether server is active
  supports_movie?: boolean        // Whether supports movies
  supports_tv?: boolean           // Whether supports TV shows
  is_download?: boolean           // Whether is download server
  priority?: number               // Display priority (lower = higher priority)
  locked_subtitle_lang?: string | null  // Locked subtitle language
}
```

### Server Type (Runtime)

```typescript
type Server = {
  id?: string           // Provider ID
  name: string          // Display name
  url: string           // Generated URL for specific content
  priority: number      // Display priority
  status: 'unknown' | 'online' | 'offline' | 'degraded'  // Server status
  responseTime?: number // Response time in ms
}
```

### API Response Format

```typescript
// GET /api/server-configs
type GetServerConfigsResponse = ServerProvider[]

// POST /api/server-configs
type CreateServerConfigResponse = ServerProvider

// PUT /api/server-configs/:id
type UpdateServerConfigResponse = ServerProvider

// DELETE /api/server-configs/:id
type DeleteServerConfigResponse = { message: string }

// POST /api/server-configs/bulk-upsert
type BulkUpsertResponse = { 
  message: string
  count: number 
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: API Configuration Usage

*For any* valid server configuration returned from the CockroachDB API, the useServers hook should correctly generate server URLs using that configuration's templates and parameters.

**Validates: Requirements 1.2**

### Property 2: Fallback on API Failure

*For any* API failure scenario (network error, 500 error, empty response), the useServers hook should fallback to the SERVER_PROVIDERS constant and continue functioning normally.

**Validates: Requirements 1.3**

### Property 3: Functionality Preservation

*For any* set of input parameters (tmdbId, type, season, episode), the migrated useServers hook should produce the same filtering, sorting, and download server identification results as the original implementation.

**Validates: Requirements 1.4**

### Property 4: Loading State Management

*For any* API fetch operation, the loading state should be true during the fetch and false after completion (success or failure).

**Validates: Requirements 1.5**

### Property 5: Request Caching

*For any* sequence of hook calls with identical parameters within the same component lifecycle, only one API request should be made to `/api/server-configs`.

**Validates: Requirements 1.6**

### Property 6: Server Switching Correctness

*For any* server switch operation on the Watch Page, the displayed URL should match the URL generated from the CockroachDB configuration for that server.

**Validates: Requirements 3.2**

### Property 7: Configuration Persistence Round-Trip

*For any* server configuration modification made through ServerTester, saving and then fetching the configuration should return the modified values.

**Validates: Requirements 3.4**

### Property 8: Referential Integrity in Reporting

*For any* server report submitted via the reportServer function, the provider_id in the link_checks table should reference a valid server configuration ID that exists in CockroachDB.

**Validates: Requirements 3.6**

### Property 9: Error Handling with Fallback

*For any* error condition in the useServers hook (API failure, network timeout, invalid response), the application should not crash and should provide a working fallback using SERVER_PROVIDERS.

**Validates: Requirements 5.5**

## Error Handling

### 1. API Fetch Errors

**Scenario**: `/api/server-configs` endpoint غير متاح أو يرجع خطأ

**Handling**:
```typescript
try {
  const response = await fetch(`${API_BASE}/api/server-configs`)
  if (!response.ok) {
    throw new Error('API request failed')
  }
  const data = await response.json()
  // Use data
} catch (error) {
  console.error('Failed to fetch server configs, using fallback:', error)
  // Fallback to SERVER_PROVIDERS constant
  const sourceProviders = SERVER_PROVIDERS
}
```

**User Impact**: التطبيق يستمر في العمل باستخدام القيم الافتراضية

### 2. Empty API Response

**Scenario**: API يرجع مصفوفة فارغة `[]`

**Handling**:
```typescript
const data = await response.json()
const sourceProviders = !error && data && data.length > 0
  ? data.map(/* transform */)
  : SERVER_PROVIDERS
```

**User Impact**: التطبيق يستخدم SERVER_PROVIDERS كـ fallback

### 3. Invalid Data Format

**Scenario**: API يرجع بيانات بصيغة غير متوقعة

**Handling**:
```typescript
const sourceProviders = data.map((row: any) => ({
  id: row.id || `fallback_${index}`,
  name: row.name || 'Unknown Server',
  base: row.base || '',
  // ... with safe defaults
}))
```

**User Impact**: البيانات المفقودة يتم تعويضها بقيم افتراضية آمنة

### 4. Network Timeout

**Scenario**: الطلب يأخذ وقت طويل جداً

**Handling**:
```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 5000)

try {
  const response = await fetch(url, { signal: controller.signal })
  clearTimeout(timeoutId)
  // Process response
} catch (error) {
  if (error.name === 'AbortError') {
    console.error('Request timeout, using fallback')
  }
  // Use SERVER_PROVIDERS fallback
}
```

**User Impact**: بعد 5 ثواني، يتم استخدام fallback

### 5. Supabase Table Not Found (After Deletion)

**Scenario**: بعد حذف الجدول من Supabase، أي كود قديم يحاول الوصول إليه

**Handling**: يجب التأكد من عدم وجود أي كود يستدعي هذا الجدول قبل الحذف

**Prevention**:
```bash
# Search for any remaining references
grep -r "server_provider_configs" src/
grep -r "from('server_provider_configs')" src/
```

## Testing Strategy

### Unit Testing

**Framework**: Vitest + React Testing Library

**Test Files**:
1. `src/hooks/useServers.test.ts` - Hook unit tests
2. `src/pages/admin/backup.test.tsx` - Backup page tests

**Unit Test Cases**:

1. **useServers Hook - API Integration**
   - Test that hook calls `/api/server-configs` on mount
   - Test that hook doesn't call Supabase for server configs
   - Test loading state transitions (true → false)

2. **useServers Hook - Fallback Behavior**
   - Test fallback to SERVER_PROVIDERS when API returns 404
   - Test fallback when API returns 500
   - Test fallback when API returns empty array
   - Test fallback when network error occurs

3. **useServers Hook - Data Transformation**
   - Test that API data is correctly mapped to Server objects
   - Test that priority sorting is maintained
   - Test that download servers are correctly identified
   - Test that inactive servers are filtered out

4. **Backup Page - Table List**
   - Test that TABLES array doesn't include 'server_provider_configs'
   - Test that table count is accurate
   - Test that export doesn't attempt to fetch server_provider_configs from Supabase

5. **Server Reporting**
   - Test that reportServer sends correct provider_id
   - Test that link_checks entry is created with valid data

### Property-Based Testing

**Framework**: fast-check (JavaScript property-based testing library)

**Configuration**: Minimum 100 iterations per test

**Property Test Cases**:

1. **Property Test: API Configuration Usage** (Property 1)
   ```typescript
   // Feature: complete-server-configs-migration, Property 1: API Configuration Usage
   fc.assert(
     fc.property(
       fc.record({
         id: fc.string(),
         name: fc.string(),
         base: fc.webUrl(),
         movie_template: fc.option(fc.string()),
         tv_template: fc.option(fc.string()),
         priority: fc.integer({ min: 0, max: 100 })
       }),
       fc.integer({ min: 1 }),
       fc.constantFrom('movie', 'tv'),
       (config, tmdbId, type) => {
         const url = generateServerUrl(config, type, tmdbId)
         expect(url).toBeTruthy()
         expect(url).toContain(String(tmdbId))
       }
     ),
     { numRuns: 100 }
   )
   ```

2. **Property Test: Fallback on API Failure** (Property 2)
   ```typescript
   // Feature: complete-server-configs-migration, Property 2: Fallback on API Failure
   fc.assert(
     fc.property(
       fc.constantFrom(404, 500, 503),
       fc.integer({ min: 1 }),
       async (errorCode, tmdbId) => {
         // Mock API to return error
         mockFetch.mockResolvedValueOnce({ ok: false, status: errorCode })
         
         const { result } = renderHook(() => useServers(tmdbId, 'movie'))
         await waitFor(() => expect(result.current.loading).toBe(false))
         
         // Should have servers from fallback
         expect(result.current.servers.length).toBeGreaterThan(0)
       }
     ),
     { numRuns: 100 }
   )
   ```

3. **Property Test: Functionality Preservation** (Property 3)
   ```typescript
   // Feature: complete-server-configs-migration, Property 3: Functionality Preservation
   fc.assert(
     fc.property(
       fc.integer({ min: 1, max: 100000 }),
       fc.constantFrom('movie', 'tv'),
       fc.integer({ min: 1, max: 10 }),
       fc.integer({ min: 1, max: 20 }),
       async (tmdbId, type, season, episode) => {
         const { result } = renderHook(() => 
           useServers(tmdbId, type, season, episode)
         )
         await waitFor(() => expect(result.current.loading).toBe(false))
         
         // Verify filtering: only active servers
         const allActive = result.current.servers.every(s => s.status !== 'offline')
         expect(allActive).toBe(true)
         
         // Verify sorting: by priority
         const priorities = result.current.servers.map(s => s.priority)
         const sorted = [...priorities].sort((a, b) => a - b)
         expect(priorities).toEqual(sorted)
         
         // Verify download servers are identified
         expect(result.current.downloadServers.length).toBeGreaterThanOrEqual(0)
       }
     ),
     { numRuns: 100 }
   )
   ```

4. **Property Test: Loading State Management** (Property 4)
   ```typescript
   // Feature: complete-server-configs-migration, Property 4: Loading State Management
   fc.assert(
     fc.property(
       fc.integer({ min: 1 }),
       async (tmdbId) => {
         const { result } = renderHook(() => useServers(tmdbId, 'movie'))
         
         // Initially loading should be true
         expect(result.current.loading).toBe(true)
         
         // After fetch completes, loading should be false
         await waitFor(() => expect(result.current.loading).toBe(false))
       }
     ),
     { numRuns: 100 }
   )
   ```

5. **Property Test: Server Switching Correctness** (Property 6)
   ```typescript
   // Feature: complete-server-configs-migration, Property 6: Server Switching Correctness
   fc.assert(
     fc.property(
       fc.integer({ min: 1 }),
       fc.integer({ min: 0, max: 10 }),
       async (tmdbId, serverIndex) => {
         const { result } = renderHook(() => useServers(tmdbId, 'movie'))
         await waitFor(() => expect(result.current.loading).toBe(false))
         
         if (result.current.servers.length > serverIndex) {
           act(() => result.current.setActive(serverIndex))
           
           const expectedUrl = result.current.servers[serverIndex].url
           expect(result.current.activeServer?.url).toBe(expectedUrl)
         }
       }
     ),
     { numRuns: 100 }
   )
   ```

6. **Property Test: Configuration Persistence Round-Trip** (Property 7)
   ```typescript
   // Feature: complete-server-configs-migration, Property 7: Configuration Persistence Round-Trip
   fc.assert(
     fc.property(
       fc.record({
         id: fc.string({ minLength: 1 }),
         name: fc.string({ minLength: 1 }),
         base: fc.webUrl(),
         priority: fc.integer({ min: 0, max: 100 })
       }),
       async (config) => {
         // Save configuration
         const saveResponse = await fetch('/api/server-configs', {
           method: 'POST',
           body: JSON.stringify(config)
         })
         expect(saveResponse.ok).toBe(true)
         
         // Fetch it back
         const fetchResponse = await fetch('/api/server-configs')
         const configs = await fetchResponse.json()
         
         // Should contain our config
         const saved = configs.find(c => c.id === config.id)
         expect(saved).toBeDefined()
         expect(saved.name).toBe(config.name)
         expect(saved.priority).toBe(config.priority)
       }
     ),
     { numRuns: 100 }
   )
   ```

7. **Property Test: Referential Integrity in Reporting** (Property 8)
   ```typescript
   // Feature: complete-server-configs-migration, Property 8: Referential Integrity in Reporting
   fc.assert(
     fc.property(
       fc.integer({ min: 1 }),
       async (tmdbId) => {
         const { result } = renderHook(() => useServers(tmdbId, 'movie'))
         await waitFor(() => expect(result.current.loading).toBe(false))
         
         // Report current server
         await act(async () => {
           await result.current.reportServer()
         })
         
         // Verify link_checks entry has valid provider_id
         const linkChecks = await fetchLinkChecks()
         const latestCheck = linkChecks[0]
         
         // Provider ID should exist in CockroachDB
         const configs = await fetch('/api/server-configs').then(r => r.json())
         const providerExists = configs.some(c => c.id === latestCheck.provider_id)
         expect(providerExists).toBe(true)
       }
     ),
     { numRuns: 100 }
   )
   ```

8. **Property Test: Error Handling with Fallback** (Property 9)
   ```typescript
   // Feature: complete-server-configs-migration, Property 9: Error Handling with Fallback
   fc.assert(
     fc.property(
       fc.oneof(
         fc.constant('network_error'),
         fc.constant('timeout'),
         fc.constant('invalid_json'),
         fc.constant('empty_response')
       ),
       fc.integer({ min: 1 }),
       async (errorType, tmdbId) => {
         // Mock different error scenarios
         switch (errorType) {
           case 'network_error':
             mockFetch.mockRejectedValueOnce(new Error('Network error'))
             break
           case 'timeout':
             mockFetch.mockImplementationOnce(() => 
               new Promise((_, reject) => 
                 setTimeout(() => reject(new Error('Timeout')), 100)
               )
             )
             break
           case 'invalid_json':
             mockFetch.mockResolvedValueOnce({ 
               ok: true, 
               json: () => Promise.reject(new Error('Invalid JSON'))
             })
             break
           case 'empty_response':
             mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) })
             break
         }
         
         // Hook should not crash
         const { result } = renderHook(() => useServers(tmdbId, 'movie'))
         await waitFor(() => expect(result.current.loading).toBe(false))
         
         // Should have fallback servers
         expect(result.current.servers.length).toBeGreaterThan(0)
       }
     ),
     { numRuns: 100 }
   )
   ```

### Integration Testing

**Test Scenarios**:

1. **End-to-End Watch Page Flow**
   - Navigate to watch page for a movie
   - Verify servers load from CockroachDB API
   - Switch between servers
   - Report a broken server
   - Verify report is saved with correct provider_id

2. **ServerTester Admin Flow**
   - Load ServerTester page
   - Verify all servers display from CockroachDB
   - Modify a server configuration
   - Save changes
   - Reload page and verify changes persisted

3. **Backup Page Flow**
   - Load backup page
   - Verify server_provider_configs is not in table list
   - Export backup
   - Verify exported JSON doesn't contain server_provider_configs from Supabase
   - Import backup
   - Verify import doesn't attempt to write server_provider_configs to Supabase

4. **Post-Deletion Verification**
   - Delete server_provider_configs table from Supabase
   - Navigate through all pages that use servers
   - Verify no errors occur
   - Verify all functionality works normally

### Manual Testing Checklist

- [ ] Watch page loads and displays servers correctly
- [ ] Server switching works on watch page
- [ ] Video playback works with all servers
- [ ] ServerTester page displays all configurations
- [ ] ServerTester can add/edit/delete configurations
- [ ] Changes in ServerTester persist after page reload
- [ ] Backup page doesn't show server_provider_configs
- [ ] Export backup doesn't include server_provider_configs from Supabase
- [ ] Import backup doesn't attempt to import server_provider_configs to Supabase
- [ ] Server reporting creates link_checks entries with valid provider_ids
- [ ] Application works normally after Supabase table deletion
- [ ] No console errors related to server_provider_configs
- [ ] Network tab shows no Supabase queries for server_provider_configs

### Test Data

**Sample Server Configurations**:
```json
[
  {
    "id": "autoembed_co",
    "name": "AutoEmbed",
    "base": "https://autoembed.co",
    "movie_template": "https://autoembed.co/movie/tmdb/{tmdbId}",
    "tv_template": "https://autoembed.co/tv/tmdb/{tmdbId}-{season}-{episode}",
    "is_active": true,
    "supports_movie": true,
    "supports_tv": true,
    "is_download": false,
    "priority": 1
  },
  {
    "id": "vidsrc_net",
    "name": "VidSrc.net",
    "base": "https://vidsrc.net/embed",
    "movie_template": "https://vidsrc.net/embed/movie/{tmdbId}",
    "tv_template": "https://vidsrc.net/embed/tv/{tmdbId}/{season}/{episode}",
    "is_active": true,
    "supports_movie": true,
    "supports_tv": true,
    "is_download": true,
    "priority": 2
  }
]
```

**Test Content IDs**:
- Movie: TMDB ID 550 (Fight Club)
- TV Show: TMDB ID 1399 (Game of Thrones), Season 1, Episode 1

