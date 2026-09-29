
## MONEY agent, 29 September 2026: the after-the-gate backlog, rebuilt for split settlement

Vallo holds no customer money (ADR 0002). Each original below assumed a wallet, a held payment or a single successful charge per booking, so it was rebuilt as a new applied migration; the original is kept here, unapplied, as history.

| Original (unapplied) | Replacement (applied live) | What changed |
|---|---|---|
| 20260924140000_v13_the_move_in_quote_is_frozen_when_the_lister_says_yes.sql | 20260929000327_money_v13_the_move_in_quote_is_frozen_when_the_lister_says_yes.sql | Quote also overrides the rent agreement's terms (trigger on deal_agreements); open_rent_charge is the live body plus the quote branch. |
| 20260924140200_v20_the_cancellation_terms_that_priced_a_stay_are_frozen_at_payment.sql | 20260929000803_money_v20_cancellation_terms_frozen_at_acceptance_and_payment.sql | Frozen into the stay agreement at host acceptance; payment trigger is the backstop. No wallet path. |
| 20260924140100_v24_every_refund_carries_a_due_by_date_that_is_measured.sql | 20260929001248_money_v24_refund_clock_to_paystack_initiation_and_success.sql | Clock measured to Paystack refund initiation and to refund.processed; fixes booking_refunds append-only guard that refused record_processor_refund. |
| 20260924140400_v36_v47_the_tenancy_file_and_the_caution_register.sql | 20260929002615_money_v36_v47_tenancy_file_and_caution_register_nothing_moves_through_vallo.sql | return_caution (wallet to wallet) removed; returns are recorded by either party, disputes and contests ruled by staff, unreturned caution escalates to a Guarantee claim. |
| 20260924140500_v54_move_in_and_move_out_reports_on_the_tenancy.sql | 20260929003036_money_v54_move_in_and_move_out_reports_on_the_tenancy.sql | Opens only when the move-in is paid in full by split. |
| 20260924140900_v86_split_the_move_in_between_flatmates.sql | 20260929004131_money_v86_flatmates_pay_their_own_shares_by_split.sql | Each flatmate pays their own split charge to the lister; settlement completes on the last share; group cancel refunds shares to the card. |
| 20260924140600_v39_price_check_learns_what_people_actually_paid.sql | 20260929005156_money_v39_price_check_learns_what_people_paid_by_split.sql | Counts only tenancies paid in full. |
| 20260924140700_v55_a_receipt_anyone_can_verify_without_an_address.sql | 20260929005312_money_v55_a_receipt_anyone_can_verify_paid_in_full_by_split.sql | Paid in full and not void; paid_in_shares flag. |
| 20260924140800_v93_v38_the_renewal_clock_and_the_flat_that_remembers.sql | 20260929005523_money_v93_v38_renewal_clock_and_the_flat_that_remembers.sql | Paid in full; exit account waits on the caution register. |
| 20260924160300_v81_face_and_fingerprint_as_the_lock_on_money.sql | 20260929005624_money_v81_the_phone_lock_guards_where_money_is_paid_out_to.sql | Same tables, re-scoped to payout and bank account changes. |
| 20260924160400_v89_the_queue_becomes_a_desk.sql | 20260929005700_money_v89_1_a_report_can_be_withdrawn_by_its_reporter.sql, 20260929005808_money_v89_2_my_reports_saved_views_and_report_signals.sql | Only the missing parts; Track K's queue_claims and queue functions untouched. |
| 20260924141000_v56_v92_two_money_holds_built_to_the_boundary_and_off.sql | none (not applied) | Both designs are held payments (agency fee held to keys; stay caution held on a wallet). They cannot exist without custody; the Vallo Guarantee does their job. |

## SCUML agent, 29 September 2026: the SCUML compliance layer, rebuilt on the live tables

The twenty SCUML files below were committed on 24 September and never applied. Each group read or wrote custody tables (escrows, wallets, wallet entries) that no longer exist. Each group was rebuilt as ONE new applied migration equal to the group's final state, with every custody object removed and the live money records (transactions, rent_payments, bookings, payout_accounts, bank_accounts, account_money_holds) watched instead. Function names, signatures and return shapes the app calls are unchanged. See docs/COMPLIANCE_SCUML.md.

| Original (unapplied) | Replacement (applied live) | What changed |
|---|---|---|
| 20260924171000_scuml_item_17_beneficial_ownership_a_mandate_before_publish.sql | 20260929001007_scuml_17_beneficial_ownership_on_live_tables.sql | acting_for no longer accepts 'escrow'; kinds are listing, booking, transaction, rent_payment. |
| 20260924171100_scuml_item_17_a_mandate_can_be_renewed_before_it_runs_out.sql | 20260929001007_scuml_17_beneficial_ownership_on_live_tables.sql | Folded in unchanged. |
| 20260924171200_scuml_item_17_the_review_a_decided_mandate_is_a_record.sql | 20260929001007_scuml_17_beneficial_ownership_on_live_tables.sql | Folded in unchanged. |
| 20260924173000_scuml_item_6_suspicious_transaction_reports.sql | 20260929002643_scuml_6_str_desk_and_hold_claims_on_live_tables.sql | STR party lookup reads transactions/rent_payments, not escrows or wallets. |
| 20260924173100_scuml_item_6_str_review_fixes.sql | 20260929002643_scuml_6_str_desk_and_hold_claims_on_live_tables.sql | Folded in. |
| 20260924173200_scuml_item_6_str_holds_are_its_own.sql | 20260929002643_scuml_6_str_desk_and_hold_claims_on_live_tables.sql | Hold claims (private.hold_claims) drive account_money_holds (reason 'plain'); the live payout/bank-account triggers refuse with a neutral sentence. |
| 20260924174000_scuml_item_7_threshold_reports.sql | 20260929003449_scuml_7_threshold_reports_on_split_settlement.sql | Observes public.transactions (SUCCESSFUL), sources 'booking' and 'rent_payment'; no escrow/wallet sources. |
| 20260924174100_scuml_item_7_one_observation_per_flow.sql | 20260929003449_scuml_7_threshold_reports_on_split_settlement.sql | One observation per charge per party (payer out, payee in). |
| 20260924174200_scuml_item_7_class_by_capacity.sql | 20260929003449_scuml_7_threshold_reports_on_split_settlement.sql | Folded in. |
| 20260924175000_scuml20_politically_exposed_persons.sql | 20260929004739_scuml_20_15_pep_and_risk_on_live_tables.sql | PEP money watch is a trigger on transactions (source_table 'transactions'), not escrows/wallet_entries. |
| 20260924175100_scuml15_risk_classification.sql | 20260929004739_scuml_20_15_pep_and_risk_on_live_tables.sql | Volume factor from SUCCESSFUL transactions over 90 days. |
| 20260924175200_scuml20_15_review_fixes.sql | 20260929004739_scuml_20_15_pep_and_risk_on_live_tables.sql | EDD gate on listings, payout_accounts, bank_accounts. |
| 20260924176000_scuml_8_sanctions_screening.sql | 20260929010407_scuml_8_sanctions_screening_on_live_tables.sql | Screening triggers on transactions, rent_payments, business_transfers (not wallet_entries/escrows); transaction kinds card_payment, rent_payment, business_transfer. |
| 20260924176100_scuml_8_the_hold_reason_names_nothing.sql | 20260929010407_scuml_8_sanctions_screening_on_live_tables.sql | Folded in. |
| 20260924176200_scuml_8_review_fixes.sql | 20260929010407_scuml_8_sanctions_screening_on_live_tables.sql | Folded in, minus escrow trigger. |
| 20260924176300_scuml_8_holds_are_claims_and_lists_need_two.sql | 20260929010407_scuml_8_sanctions_screening_on_live_tables.sql | Uses the claim model from the item 6 replacement. |
| 20260924176400_scuml_8_the_desk_waits_only_on_what_can_move.sql | 20260929010407_scuml_8_sanctions_screening_on_live_tables.sql | Folded in. |
| 20260924176500_scuml_8_common_names_are_hits_in_their_own_group.sql | 20260929010407_scuml_8_sanctions_screening_on_live_tables.sql | Folded in. |
| 20260924176600_scuml_8_15_only_a_decided_or_exact_match_moves_the_class.sql | 20260929010407_scuml_8_sanctions_screening_on_live_tables.sql | risk_people_due reads transactions/rent_payments, not escrows/wallets. |
| 20260924176700_scuml_8_15_an_exact_common_name_waits_for_two_people.sql | 20260929010407_scuml_8_sanctions_screening_on_live_tables.sql | Folded in (final semantics of sanctions_hit_for). |
