/*
 * THE EXAMPLES' LISTER STILL CARRIED THE OLD NAME.
 *
 * `20260809080755_the_example_collection_is_listed_by_the_platform_not_by_a_person`
 * created one institutional account to list the example catalogue, and named
 * it "RentMe Example Collection", the brand this platform was called before it
 * was Vallo. Every example card and page that names its lister has printed
 * that since (the audit's walk of `/rent` saw it on all 64 cards: "Listed by
 * RentMe Example Collection").
 *
 * The name lives in three places, and all three are renamed together so a
 * reader who taps through to the lister is never told a different name from
 * the one the listing told them: the agent row the listings point at, the
 * account's profile, and the auth metadata the sign-up trigger copied the
 * profile from.
 *
 * Scoped by the two fixed ids that migration created and by the old name, so
 * it renames exactly that account and is a no-op if it has already been done.
 * The account's email (`example-collection@rentme.invalid`) is left alone: an
 * `.invalid` address is never shown, never sent to, and changing an auth
 * identity to tidy a string nobody reads is a risk with no reader.
 */

begin;

update public.agents
   set display_name = 'Vallo Example Collection'
 where id = 'e0000000-0000-4000-8000-000000000002'
   and display_name = 'RentMe Example Collection';

update public.profiles
   set display_name = 'Vallo Example Collection'
 where id = 'e0000000-0000-4000-8000-000000000001'
   and display_name = 'RentMe Example Collection';

update auth.users
   set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
         || jsonb_build_object('display_name', 'Vallo Example Collection')
 where id = 'e0000000-0000-4000-8000-000000000001'
   and raw_user_meta_data ->> 'display_name' = 'RentMe Example Collection';

commit;
