-- Pin search_path so the functions can't be hijacked by objects in a caller's schema.
-- (All table and type references inside them are already schema-qualified.)
alter function public.touch_updated_at() set search_path = '';
alter function public.cast_vote(uuid, text) set search_path = '';
alter function public.request_song(text, text, text, text, text) set search_path = '';
alter function public.hit_rate_limit(text, integer, integer) set search_path = '';
