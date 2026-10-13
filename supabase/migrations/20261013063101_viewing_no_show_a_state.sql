-- Applied 13 October 2026. The enum value is applied alone: a new value cannot be used in the transaction that adds it.
alter type public.inspection_state add value if not exists 'NO_SHOW';
