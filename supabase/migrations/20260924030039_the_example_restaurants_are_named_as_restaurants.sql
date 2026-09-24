-- UI-P2-03: two example rows were titled as premises ("Restaurant unit",
-- "Restaurant space") while they are priced per head and drawn as places to
-- eat. A lister reading them, or a diner, took them for commercial space to
-- let. They are renamed for what they are, a restaurant; the price, the kind
-- and every other column are unchanged. Examples only (is_demo), matched by
-- id and by the old title so a row edited since is left alone.
update public.listings
   set title = 'Restaurant in Jabi',
       description = 'A working restaurant with a fitted kitchen and covered outdoor seating. Priced per head.'
 where id = 'ed000000-0000-4000-8000-00000000001e'
   and is_demo
   and title = 'Restaurant space in Jabi';

update public.listings
   set title = 'Restaurant in Bodija'
 where id = 'ed000000-0000-4000-8000-00000000002a'
   and is_demo
   and title = 'Restaurant unit in Bodija';