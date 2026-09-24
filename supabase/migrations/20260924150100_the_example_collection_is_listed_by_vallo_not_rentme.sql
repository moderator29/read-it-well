/*
 * THE EXAMPLES' LISTER: THE LAST PLACE THAT STILL CARRIED THE OLD NAME.
 *
 * `20260809080755_the_example_collection_is_listed_by_the_platform_not_by_a_person`
 * named the one institutional account that lists the example catalogue
 * "RentMe Example Collection", the brand this platform had before it was
 * Vallo, in three places: the agent row the listings point at, the account's
 * profile, and the auth metadata the sign-up trigger copied the profile from.
 *
 * Migration `20260924002102_the_example_collection_is_named_for_vallo`
 * (applied live on 24 September, from outside this branch) renamed the first
 * two to "Vallo Examples". Measured on the live database afterwards: agent row
 * "Vallo Examples", profile "Vallo Examples", auth metadata still "RentMe
 * Example Collection". So this migration no longer picks a name. It makes the
 * third place agree with whatever the agent row is called now, and it touches
 * nothing if the metadata already agrees or no longer carries the old brand.
 *
 * The account's email (`example-collection@rentme.invalid`) is left alone: an
 * `.invalid` address is never shown and never sent to.
 */

begin;

update auth.users u
   set raw_user_meta_data = coalesce(u.raw_user_meta_data, '{}'::jsonb)
         || jsonb_build_object('display_name', a.display_name)
  from public.agents a
 where u.id = 'e0000000-0000-4000-8000-000000000001'
   and a.id = 'e0000000-0000-4000-8000-000000000002'
   and a.display_name is not null
   and a.display_name not ilike '%rentme%'
   and u.raw_user_meta_data ->> 'display_name' ilike '%rentme%';

commit;
