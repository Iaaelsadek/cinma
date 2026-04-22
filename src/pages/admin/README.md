# Admin Dashboard - Ingestion Pipeline

## Overview

The Ingestion Dashboard is the control center for 4Cima's content ingestion pipeline. It provides real-time monitoring, manual queue management, and batch processing controls.

## Access

**URL**: `/admin/ingestion`

**Authentication**: Requires admin role (protected by `ProtectedAdmin` wrapper)

## Features

### 1. Real-time Statistics
- Total items in ingestion log
- Pending items (waiting to be processed)
- Processing items (currently being ingested)
- Success count (successfully ingested)
- Failed count (failed ingestion attempts)
- Skipped count (items that didn't meet quality criteria)

### 2. Ingestion Log Table
- Paginated view (50 items per page)
- Filterable by status and content type
- Sortable by creation date (newest first)
- Color-coded status badges
- Clickable result slugs (links to content pages)
- Error message display with truncation

### 3. Manual Queue Interface

#### Individual Item Form
- Source dropdown (TMDB, RAWG, IGDB, MANUAL)
- External ID input (e.g., TMDB ID: 550)
- Content type dropdown (movie, tv_series, game, software, actor)
- Notes field (optional)

#### CSV Bulk Upload
- File input for CSV files
- Format: `source,external_id,content_type,notes`
- Example:
```csv
source,external_id,content_type,notes
TMDB,550,movie,Fight Club
TMDB,1399,tv_series,Game of Thrones
```

### 4. Action Buttons

#### Manual Refresh
- Manually refresh statistics and log
- Useful when auto-refresh is disabled

#### Re-queue Failed
- Bulk operation to reset all failed items to pending status
- Shows count of failed items
- Requires confirmation

#### Trigger Processing
- Start batch processing of pending items
- Processes up to 1 batch (50 items) at a time
- Disabled when no pending items or processing is already running

#### Auto-refresh Toggle
- Enable/disable automatic refresh every 10 seconds
- Useful for real-time monitoring

### 5. Filters

#### Status Filter
- All (default)
- Pending
- Processing
- Success
- Failed
- Skipped

#### Content Type Filter
- All (default)
- Movie
- TV Series
- Game
- Software
- Actor

**Note**: Changing filters resets pagination to page 1

## API Integration

### Endpoints Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/admin/ingestion/stats` | GET | Fetch statistics |
| `/api/admin/ingestion/log` | GET | Fetch log with filters |
| `/api/admin/ingestion/queue` | POST | Queue items |
| `/api/admin/ingestion/requeue-failed` | POST | Re-queue failed items |
| `/api/admin/ingestion/process` | POST | Trigger processing |

### Authentication

All requests include:
- `X-API-Key` header (API key protection)
- `Authorization: Bearer {token}` header (Supabase JWT)

## Component Structure

```
IngestionDashboard.tsx
├── StatusBadge (sub-component)
│   └── Color-coded status badges
├── Statistics Cards
│   └── 6 metric cards with loading states
├── Action Buttons
│   ├── Manual Refresh
│   ├── Re-queue Failed
│   ├── Trigger Processing
│   └── Auto-refresh Toggle
├── Manual Queue Interface
│   ├── Individual Item Form
│   └── CSV Bulk Upload
├── Filters
│   ├── Status Filter
│   └── Content Type Filter
└── Ingestion Log Table
    ├── Table Header
    ├── Table Body (with loading/empty states)
    └── Pagination Controls
```

## State Management

### Local State
- `stats` - Ingestion statistics
- `logItems` - Log items array
- `loading` - Loading state
- `error` - Error message
- `currentPage` - Current page number
- `totalPages` - Total pages count
- `totalItems` - Total items count
- `statusFilter` - Selected status filter
- `contentTypeFilter` - Selected content type filter
- `autoRefresh` - Auto-refresh enabled/disabled
- `queueForm` - Manual queue form data
- `queueLoading` - Queue form loading state
- `csvFile` - Selected CSV file
- `csvLoading` - CSV upload loading state

### Effects
- Initial data fetch on mount
- Auto-refresh interval (10 seconds)
- Re-fetch on filter/pagination changes

## Error Handling

All API calls are wrapped in try-catch blocks:
- Errors are displayed in alert dialogs
- Errors are logged to console
- Loading states are reset on error

## Loading States

- Initial page load: Full-page spinner
- Data refresh: Disabled buttons
- Form submission: Button text changes to "Loading..."
- CSV upload: Button text changes to "Uploading..."

## Responsive Design

- Mobile-friendly layout
- Responsive grid for statistics cards
- Horizontal scroll for table on small screens
- Stacked form fields on mobile

## Testing

### Manual Testing Steps

1. **View Statistics**
   - Navigate to `/admin/ingestion`
   - Verify 6 metric cards display
   - Verify numbers load correctly

2. **View Log**
   - Verify table displays items
   - Verify pagination works
   - Verify filters work

3. **Queue Item**
   - Fill form with TMDB ID: 550, Type: movie
   - Submit form
   - Verify success alert
   - Verify item appears in log

4. **Upload CSV**
   - Create CSV file with test data
   - Upload file
   - Verify success alert
   - Verify items appear in log

5. **Re-queue Failed**
   - Ensure failed items exist
   - Click "Re-queue Failed"
   - Verify confirmation dialog
   - Verify items reset to pending

6. **Trigger Processing**
   - Ensure pending items exist
   - Click "Trigger Processing"
   - Verify confirmation dialog
   - Verify processing starts

7. **Test Filters**
   - Select status filter
   - Verify log filters correctly
   - Select content type filter
   - Verify log filters correctly

8. **Test Auto-refresh**
   - Enable auto-refresh
   - Wait 10 seconds
   - Verify data refreshes
   - Disable auto-refresh
   - Verify refresh stops

## Troubleshooting

### Dashboard doesn't load
- Check if backend server is running on port 8080
- Check if `VITE_API_URL` is set correctly in `.env.local`
- Check browser console for errors

### API requests fail
- Check if `VITE_API_KEY` is set correctly
- Check if user is authenticated (Supabase session)
- Check backend logs for errors

### Statistics show 0
- Check if ingestion_log table has data
- Check if database connection is working
- Run health check: `http://localhost:8080/health`

### Items not appearing in log
- Check if filters are applied
- Check if pagination is on correct page
- Check if items were actually queued (check backend logs)

## Future Enhancements

1. Real-time WebSocket updates (instead of polling)
2. Export functionality (CSV, JSON)
3. Advanced filters (date range, error type)
4. Bulk edit functionality
5. Ingestion analytics dashboard
6. Notification system for failed items
7. Retry individual items
8. View item details modal
9. Search functionality
10. Sort by different columns

## Related Files

- `src/services/ingestionAPI.ts` - API service functions
- `server/routes/admin-ingestion.js` - Backend API routes
- `src/routes/AdminRoutes.tsx` - Route configuration
- `.env.example` - Environment variables template

## Documentation

- [Phase 5 Integration Complete](.kiro/specs/cinema-online-complete-rebuild/PHASE_5_INTEGRATION_COMPLETE.md)
- [Final Integration Report](.kiro/specs/cinema-online-complete-rebuild/FINAL_INTEGRATION_REPORT.md)
- [Design Document](.kiro/specs/cinema-online-complete-rebuild/design.md)
- [Requirements Document](.kiro/specs/cinema-online-complete-rebuild/requirements.md)

---

**Last Updated**: 2026-04-02  
**Component**: IngestionDashboard.tsx  
**Author**: 4Cima Team
