-- The live migration history names each migration by the version its file
-- carries in this repository.
--
-- 71 migrations were applied to live under a version (and, for three, a
-- name) other than the file that holds them, so `supabase db push` saw 71
-- unapplied files and a reset or a branch built from the directory could not
-- be matched against live. Renaming the files would have touched the tests
-- and comments that cite them by path; the history is corrected instead, as
-- `supabase migration repair` would. Only supabase_migrations.schema_migrations
-- changes; the statements each row recorded are kept as they were applied.

do $$
declare
  r record;
  n int;
begin
  for r in select * from (values
    ('20260918080911', 'm10_a_thread_knows_what_it_is_about', '20260918120000', 'm10_a_thread_knows_what_it_is_about'),
    ('20260918081114', 'm10_the_shape_check_speaks_before_the_party_check', '20260918120050', 'm10_the_shape_check_speaks_before_the_party_check'),
    ('20260918081135', 'm11_an_inspection_tells_both_sides_what_happened', '20260918120100', 'm11_an_inspection_tells_both_sides_what_happened'),
    ('20260918081749', 'm12_a_person_can_keep_a_card_and_a_bank_account', '20260918120200', 'm12_a_person_can_keep_a_card_and_a_bank_account'),
    ('20260918082358', 'm12_promotion_moves_to_an_after_trigger', '20260918120250', 'm12_promotion_moves_to_an_after_trigger'),
    ('20260918082412', 'm13_a_saved_place_can_be_a_stay_or_a_table', '20260918120300', 'm13_a_saved_place_can_be_a_stay_or_a_table'),
    ('20260918124404', 'm14_a_host_applies_with_papers_and_consents', '20260918120400', 'm14_a_host_applies_with_papers_and_consents'),
    ('20260918124411', 'm15_a_business_climbs_a_verification_ladder', '20260918120500', 'm15_a_business_climbs_a_verification_ladder'),
    ('20260918224359', 'b4_booking_lifecycle_sweeps', '20260918151000', 'b4_booking_lifecycle_sweeps'),
    ('20260918224532', 'b4_inventory_drift_and_cron_watch', '20260918151100', 'b4_inventory_drift_and_cron_watch'),
    ('20260918225045', 'b3_no_table_at_an_example_a_thread_per_table_and_the_rent_charge', '20260918140000', 'b3_no_table_at_an_example_a_thread_per_table_and_the_rent_charge'),
    ('20260918225213', 'b2_example_stays_and_the_example_shelf_gets_its_photographs', '20260918140100', 'b2_example_stays_and_the_example_shelf_gets_its_photographs'),
    ('20260918235106', 'b7_admin_user_id_by_email', '20260918150000', 'b7_admin_user_id_by_email'),
    ('20260918235111', 'b5_a_block_holds_in_messaging', '20260918150200', 'b5_a_block_holds_in_messaging'),
    ('20260918235115', 'b4_the_badge_sweep_skips_the_example_lister', '20260918151200', 'b4_the_badge_sweep_skips_the_example_lister'),
    ('20260919170510', 'b3_a_block_holds_on_an_attachment_too', '20260919140000', 'b3_a_block_holds_on_an_attachment_too'),
    ('20260919170715', 'b1_the_example_refusal_covers_every_remaining_door', '20260919103000', 'b1_the_example_refusal_covers_every_remaining_door'),
    ('20260919171510', 'b4_a_stay_notification_lands_on_the_stays_side', '20260919101500', 'b4_a_stay_notification_lands_on_the_stays_side'),
    ('20260919171522', 'b4_a_refund_tells_the_guest_what_came_back', '20260919101600', 'b4_a_refund_tells_the_guest_what_came_back'),
    ('20260919171529', 'b4_a_flag_stops_keeping_the_account_number', '20260919101700', 'b4_a_flag_stops_keeping_the_account_number'),
    ('20260919172756', 'b5_an_account_can_ask_to_be_deleted', '20260919160000', 'b5_an_account_can_ask_to_be_deleted'),
    ('20260919172936', 'b5_the_purge_runs_in_one_transaction', '20260919160100', 'b5_the_purge_runs_in_one_transaction'),
    ('20260919174201', 'o2_a_saved_search_can_be_named_watched_and_told_about', '20260919183000', 'o2_a_saved_search_can_be_named_watched_and_told_about'),
    ('20260919174557', 'lead_a_trigger_function_is_not_a_rest_endpoint', '20260919190000', 'lead_a_trigger_function_is_not_a_rest_endpoint'),
    ('20260919213006', 'p1_a_business_is_never_left_ownerless', '20260919210000', 'p1_a_business_is_never_left_ownerless'),
    ('20260919214015', 'p1_a_future_event_is_cancelled_with_notice', '20260919210100', 'p1_a_future_event_is_cancelled_with_notice'),
    ('20260919214402', 'p3_a_restaurant_can_carry_photographs', '20260919220000', 'p3_a_restaurant_can_carry_photographs'),
    ('20260919222432', 'p2_a_verified_agent_means_a_person_was_checked', '20260919230000', 'p2_a_verified_agent_means_a_person_was_checked'),
    ('20260922122456', 'c1_a_listing_carries_a_code_a_person_can_read_out', '20260922110000', 'c1_a_listing_carries_a_code_a_person_can_read_out'),
    ('20260922122534', 'c1_the_agent_reference_carries_the_live_brand', '20260922110100', 'c1_the_agent_reference_carries_the_live_brand'),
    ('20260922123239', 'the_escrow_doors_are_locked_and_trust_stops_answering_strangers', '20260922120000', 'the_escrow_doors_are_locked_and_trust_stops_answering_strangers'),
    ('20260922124632', 'the_engine_stops_saying_rentme', '20260922130000', 'the_engine_stops_saying_rentme'),
    ('20260922124659', 'the_database_stops_saying_rentme', '20260915090000', 'the_database_stops_saying_rentme'),
    ('20260922125410', 'a_wallet_can_set_money_aside', '20260812090000', 'a_wallet_can_set_money_aside'),
    ('20260922125650', 'pots_move_money_under_the_wallet_lock', '20260812090100', 'pots_move_money_under_the_wallet_lock'),
    ('20260922130209', 'c1_the_welcome_is_sent_once_and_the_database_says_so', '20260922140100', 'c1_the_welcome_is_sent_once_and_the_database_says_so'),
    ('20260922130344', 'a_person_says_yes_to_the_terms_and_we_keep_the_receipt', '20260922150000', 'a_person_says_yes_to_the_terms_and_we_keep_the_receipt'),
    ('20260922131546', 'c1_three_amenities_the_wizard_offers_and_the_database_never_had', '20260922150100', 'c1_three_amenities_the_wizard_offers_and_the_database_never_had'),
    ('20260922132709', 'c1_what_a_buyer_actually_pays', '20260922160000', 'c1_what_a_buyer_actually_pays'),
    ('20260922135127', 'the_stats_band_counts_only_what_can_be_transacted', '20260922150200', 'the_stats_band_counts_only_what_can_be_transacted'),
    ('20260922140251', 'b1b_the_three_registration_forms', '20260922170000', 'b1b_the_three_registration_forms'),
    ('20260922141304', 'c2_a_stay_may_not_take_a_fulfilment_the_interface_cannot_tell_the_truth_about', '20260922160100', 'c2_a_stay_may_not_take_a_fulfilment_the_interface_cannot_tell_the_truth_about'),
    ('20260922143932', 'the_probe_that_committed_its_own_evidence_gives_back_its_two_messages', '20260922180000', 'the_probe_that_committed_its_own_evidence_gives_back_its_two_messages'),
    ('20260922155208', 'the_reconciliation_url_survives_a_pasted_newline', '20260922190200', 'the_reconciliation_url_survives_a_pasted_newline'),
    ('20260922160331', 'the_money_job_reads_its_own_reply', '20260922200100', 'the_money_job_reads_its_own_reply'),
    ('20260922165435', 'the_database_scheduler_says_who_it_is', '20260922210000', 'the_database_scheduler_says_who_it_is'),
    ('20260922170409', 'imgc_a_shortlet_is_not_a_hotel_room', '20260922190100', 'imgc_a_shortlet_is_not_a_hotel_room'),
    ('20260922173614', 'imgc_a_bedroom_is_not_a_bed', '20260922200000', 'imgc_a_bedroom_is_not_a_bed'),
    ('20260922185757', 'a_job_that_failed_and_recovered_is_not_a_failing_job', '20260922190000', 'a_job_that_failed_and_recovered_is_not_a_failing_job'),
    ('20260922194243', 'a_post_is_scanned_for_abuse_as_well_as_fraud', '20260922140000', 'a_post_is_scanned_for_abuse_as_well_as_fraud'),
    ('20260922194329', 'a_post_is_scanned_for_abuse_part_two_the_terms_tick_reaches_the_row', '20260922193000', 'a_post_is_scanned_for_abuse_part_two_the_terms_tick_reaches_the_row'),
    ('20260922221227', 'escrow_gains_a_cancelled_state_and_an_agency_fee_purpose', '20260922220000', 'escrow_gains_a_cancelled_state_and_an_agency_fee_purpose'),
    ('20260922221441', 'track_g_1_two_enums_and_the_person_role', '20260922230000', 'track_g_1_two_enums_and_the_person_role'),
    ('20260922221500', 'track_g_2_the_subtypes_a_nigerian_claim_comes_in', '20260922230100', 'track_g_2_the_subtypes_a_nigerian_claim_comes_in'),
    -- After track_g_2, which frees 20260922221500.
    ('20260922222506', 'spendable_arithmetic_lives_in_one_place', '20260922221500', 'spendable_arithmetic_lives_in_one_place'),
    ('20260922221550', 'track_g_3_the_pair_axis_the_listing_says_what_its_lister_is', '20260922230200', 'track_g_3_the_pair_axis_the_listing_says_what_its_lister_is'),
    ('20260922221700', 'track_g_4_the_firms_staff_and_the_two_doors_into_it', '20260922230300', 'track_g_4_the_firms_staff_and_the_two_doors_into_it'),
    ('20260922221750', 'track_g_5_the_mandate_and_the_document_that_names_a_property', '20260922230400', 'track_g_5_the_mandate_and_the_document_that_names_a_property'),
    ('20260922221913', 'track_g_6_the_firm_arm_on_owns_listing_and_the_publish_gate', '20260922230500', 'track_g_6_the_firm_arm_on_owns_listing_and_the_publish_gate'),
    ('20260922222447', 'escrow_the_seven_remaining_fixes_before_any_product', '20260922221000', 'escrow_the_seven_remaining_fixes_before_any_product'),
    ('20260922222640', 'the_fourth_copy_of_spendable_was_in_send_money', '20260922221800', 'the_fourth_copy_of_spendable_was_in_send_money'),
    ('20260922223701', 'the_escrow_float_is_booked_as_a_liability', '20260923010000', 'the_escrow_float_is_booked_as_a_liability'),
    ('20260922224256', 'the_float_identity_is_asserted_on_a_schedule', '20260923011000', 'the_float_identity_is_asserted_on_a_schedule'),
    ('20260922224436', 'the_invariant_dedup_compared_a_column_with_itself', '20260923011500', 'the_invariant_dedup_compared_a_column_with_itself'),
    ('20260922230541', 'a_dispute_captures_evidence_and_evidence_means_files_and_facts', '20260923012000', 'a_dispute_captures_evidence_and_evidence_means_files_and_facts'),
    ('20260922230659', 'a_cancelled_agreement_still_owes_the_record_a_sentence', '20260923012500', 'a_cancelled_agreement_still_owes_the_record_a_sentence'),
    ('20260922235316', 'a_ruling_is_twenty_characters_and_reaches_both_parties_verbatim', '20260923013000', 'a_ruling_is_twenty_characters_and_reaches_both_parties_verbatim'),
    ('20260923000342', 'nine_private_functions_were_never_born_locked_and_two_of_them_grant_staff_roles', '20260923001500', 'nine_private_functions_were_never_born_locked'),
    ('20260923081034', 'nine_identical_rows_fold_into_one_because_an_empty_list_is_a_state', '20260923081500', 'nine_identical_rows_fold_into_one'),
    ('20260923092513', 'one_bad_character_in_a_blocked_term_would_break_the_filter_for_every_post', '20260923083000', 'blocked_terms_guard_against_regex_metacharacters'),
    ('20260923134749', 'the_facts_panel_does_not_carry_stage_one_and_the_data_says_so', '20260923140000', 'the_facts_panel_does_not_carry_stage_one_and_the_data_says_so')
  ) as v(live_version, live_name, file_version, file_name)
  loop
    -- Already in the file's name (a reset or branch built from this
    -- directory records every file as it runs): nothing to correct.
    if exists (select 1 from supabase_migrations.schema_migrations
                where version = r.file_version and name = r.file_name)
       and not exists (select 1 from supabase_migrations.schema_migrations
                        where version = r.live_version and name = r.live_name) then
      continue;
    end if;
    if exists (select 1 from supabase_migrations.schema_migrations where version = r.file_version) then
      raise exception 'version % is already in the history', r.file_version;
    end if;
    update supabase_migrations.schema_migrations
       set version = r.file_version, name = r.file_name
     where version = r.live_version and name = r.live_name;
    get diagnostics n = row_count;
    if n <> 1 then
      raise exception 'history row %_% not found (% rows)', r.live_version, r.live_name, n;
    end if;
  end loop;
end
$$;
