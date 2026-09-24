-- THE DEAD BRAND. The example collection is Vallo's, and so is its name: the
-- demo agent and its profile said "RentMe Example Collection" (a dead working
-- name) on every example card ("Listed by ..."), and 22 system posts in the
-- feed said places were "open on RentMe". Data only.
--
-- Reversal (lossless: none of these 22 bodies contained "Vallo" before):
--   update public.posts set body = replace(body, 'Vallo', 'RentMe') where id in (<the 22 ids below>);
--   and set the three names back to 'RentMe Example Collection'.
update public.agents
   set display_name = 'Vallo Examples'
 where display_name = 'RentMe Example Collection'
   and is_demo;

update public.profiles
   set display_name = 'Vallo Examples'
 where display_name = 'RentMe Example Collection';

update public.social_profiles
   set display_label = 'Vallo Examples'
 where display_label = 'RentMe Example Collection';

update public.posts
   set body = replace(body, 'RentMe', 'Vallo')
 where author_kind = 'SYSTEM'
   and body like '%RentMe%'
   and id in (
     '08d2c8a1-b4a4-4a98-af7d-5a0fc0b66536', '092276ce-7e16-4824-8407-aa615c488914',
     '09d07e98-ba08-4b9e-9753-48cb30231c4d', '175d1ba0-d642-436f-a7d4-8541f1287bf0',
     '1d9b8f95-1586-4b86-8891-68e52836e7ae', '25834b81-31d1-4421-915a-60b93dd7b8eb',
     '40dc04e2-abfe-4f08-878d-92c8cb8fa881', '410c3af7-8f50-4b26-a789-5f1582458aec',
     '426dd2d3-3ccb-47de-9f83-a4ba2ddff90f', '5b5fedbf-a86e-4bd6-877b-c512e6ec8ecf',
     '624ed7f8-a1d4-41eb-98db-3ca6d796ae36', '68dafa68-e923-4780-b55f-de2f74885a6b',
     '7675fef6-11e0-486a-aff2-c61803b051ec', '79e96134-009b-463d-9153-a978c2d75c08',
     '990ff48a-e39c-4a8e-8452-143d09b25d24', '9b69c621-a3c0-4b63-b4f9-98079299253b',
     '9f9ae7f9-b0d1-4527-8356-c9498aaf6cc3', 'bd76b0f8-d5e1-44ee-bde4-03156cad638e',
     'c4c1d910-5d3a-480c-b5d7-4c32c5b48edf', 'd7a7d977-84b2-4fc2-b3cc-de422e1a7fa8',
     'f8aed07c-576e-467b-a5ce-347f83d0a3ed', 'f99c61f7-2231-4e86-b701-3fbb0baf5b92'
   );