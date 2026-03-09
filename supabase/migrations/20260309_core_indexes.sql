create index if not exists idx_continue_watching_user_updated_at
  on public.continue_watching (user_id, updated_at desc);

create index if not exists idx_history_user_watched_at
  on public.history (user_id, watched_at desc);

create index if not exists idx_watchlist_user_type_content
  on public.watchlist (user_id, content_type, content_id);

create index if not exists idx_activity_feed_user_created_at
  on public.activity_feed (user_id, created_at desc);

create index if not exists idx_comments_content_type_created_at
  on public.comments (content_id, content_type, created_at desc);

