\set ON_ERROR_STOP 1
insert into auth.users(id,email) values ('00000000-0000-0000-0000-00000000000a','renter'),('00000000-0000-0000-0000-00000000000b','lister'),('00000000-0000-0000-0000-00000000000c','admin');
insert into public.user_roles values ('00000000-0000-0000-0000-00000000000c','admin');
insert into public.agents(id,user_id) values ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-00000000000b');
insert into public.listings(id,agent_id,title,listing_intent,rent_amount_minor,caution_deposit_minor,rent_period) values ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000a1','Two bed Yaba','rent',200000000,20000000,'year');
insert into public.inspection_requests(id,listing_id,requester_id,state) values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-00000000000a','CONFIRMED');
\echo '1. no report yet ->'
select public.agreement_open_rent_as('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000e1',current_date+5)->>'status';
insert into public.inspection_reports values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-00000000000a',null,now());
insert into public.inspection_report_items select '00000000-0000-0000-0000-0000000000e1', i, true from unnest(array['exterior','interior','kitchen','bathrooms','utilities','appliances','safety']) i;
\echo '2. seven items ->'
select public.agreement_open_rent_as('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000e1',current_date+5)->>'status';
insert into public.inspection_report_items values ('00000000-0000-0000-0000-0000000000e1','overall',true);
insert into public.inspection_report_photos(inspection_id,item,storage_path) values ('00000000-0000-0000-0000-0000000000e1','kitchen','p1'),('00000000-0000-0000-0000-0000000000e1','kitchen','p2');
\echo '3. two photos ->'
select public.agreement_open_rent_as('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000e1',current_date+5)->>'status';
insert into public.inspection_report_photos(inspection_id,item,storage_path) values ('00000000-0000-0000-0000-0000000000e1','safety','p3');
\echo '4. a stranger ->'
select public.agreement_open_rent_as('00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-0000000000e1',current_date+5)->>'status';
\echo '5. evidenced ->'
select public.agreement_open_rent_as('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000e1',current_date)->>'status';
select id as ag, amount_minor, terms->>'inspection_fee_minor' fee from public.deal_agreements \gset
\echo amount :amount_minor inspection fee :fee
\echo '6. stale version ->'
select public.agreement_confirm_as('00000000-0000-0000-0000-00000000000a',:'ag',99)->>'status';
select public.agreement_confirm_as('00000000-0000-0000-0000-00000000000a',:'ag',1)->>'status' renter_confirm;
\echo '7. amend lapses the renter confirmation ->'
select public.agreement_amend_as('00000000-0000-0000-0000-00000000000b',:'ag',current_date,current_date+1,'Keys at the gate')->>'terms_version';
select renter_confirmed_version is null lapsed from public.deal_agreements;
insert into public.listing_mandates(listing_id,review_status) values ('00000000-0000-0000-0000-0000000000f1','pending');
\echo '8. owner confirm with only a pending mandate ->'
select public.agreement_confirm_as('00000000-0000-0000-0000-00000000000b',:'ag',2)->>'status';
update public.listing_mandates set review_status='approved', reviewed_at=now();
select public.agreement_confirm_as('00000000-0000-0000-0000-00000000000b',:'ag',2)->>'status' owner;
select public.agreement_confirm_as('00000000-0000-0000-0000-00000000000a',:'ag',2)->>'agreement_status' after_both;
\echo '9. payment before approval: the split says ->'
insert into public.bookings(id,listing_id,guest_id,check_in,check_out,total_minor) values ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-00000000000a',current_date,current_date+1,220000000);
\echo '   rent charge before approval ->'
do $$ begin insert into public.rent_payments(inspection_id,listing_id,tenant_id,booking_id,total_minor) values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000b1',220000000); raise notice 'WRONGLY ALLOWED'; exception when others then raise notice 'refused: %', sqlerrm; end $$;
\echo '10. a member (not staff) decides ->'
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
select public.admin_decide_agreement(:'ag','approve')->>'status';
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
\echo '11. reject without reason ->'
select public.admin_decide_agreement(:'ag','reject','no')->>'status';
select public.admin_decide_agreement(:'ag','approve')->>'status' approve;
select count(*) notifications from public.notifications where title like 'Agreement approved%';
select string_agg(template||'>'||(payload->>'viewer'), ', ') emails from public.email_outbox;
\echo '12. approve twice ->'
select public.admin_decide_agreement(:'ag','approve')->>'status';
insert into public.rent_payments(inspection_id,listing_id,tenant_id,booking_id,total_minor) values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000b1',220000000);
\echo '13. split with no payout subaccount ->'
select public.payment_split_for_booking('00000000-0000-0000-0000-0000000000b1')->>'status';
insert into public.payout_accounts(agent_id, paystack_subaccount_code) values ('00000000-0000-0000-0000-0000000000a1','ACCT_lister');
select public.payment_split_for_booking('00000000-0000-0000-0000-0000000000b1') split \gset
\echo :split
\echo '14. a charge with no split ->'
do $$ begin insert into public.transactions(booking_id,provider,provider_ref,amount_minor,status) values ('00000000-0000-0000-0000-0000000000b1','paystack','rm-x',220000000,'PENDING'); raise notice 'WRONGLY ALLOWED'; exception when others then raise notice 'refused: %', sqlerrm; end $$;
\echo '15. a split that does not add up ->'
do $$ begin insert into public.transactions(booking_id,provider,provider_ref,amount_minor,status,agreement_id,payee_subaccount_code,reserve_subaccount_code,lister_share_minor,guarantee_minor,commission_minor) select '00000000-0000-0000-0000-0000000000b1','paystack','rm-y',220000000,'PENDING',id,'ACCT_lister','ACCT_reserve',220000000,3300000,0 from public.deal_agreements; raise notice 'WRONGLY ALLOWED'; exception when others then raise notice 'refused: %', sqlerrm; end $$;
insert into public.transactions(booking_id,provider,provider_ref,amount_minor,status,agreement_id,payee_subaccount_code,reserve_subaccount_code,lister_share_minor,guarantee_minor,commission_minor) select '00000000-0000-0000-0000-0000000000b1','paystack','rm-ok',220000000,'PENDING',id,'ACCT_lister','ACCT_reserve',216700000,3300000,0 from public.deal_agreements;
\echo '16. settle ->'
select private.settle_booking_charge('rm-ok',220000000,200000)->'ledger' ledger;
select status from public.deal_agreements;
select private.guarantee_reserve_balance() reserve;
\echo '17. settle again ->'
select private.settle_booking_charge('rm-ok',220000000,200000)->>'outcome';
\echo '18. a claim over what was paid ->'
select public.guarantee_claim_file_as('00000000-0000-0000-0000-00000000000a',:'ag',array['kitchen'],'The kitchen tap leaks badly and the cooker does not light at all.','{}',999999999)->>'status';
\echo '19. a claim citing nothing ->'
select public.guarantee_claim_file_as('00000000-0000-0000-0000-00000000000a',:'ag','{}','The kitchen tap leaks badly and the cooker does not light at all.','{}',5000000)->>'status';
\echo '20. evidence in somebody else''s folder ->'
select public.guarantee_claim_file_as('00000000-0000-0000-0000-00000000000a',:'ag','{}','The kitchen tap leaks badly and the cooker does not light at all.',array['00000000-0000-0000-0000-00000000000b/x.jpg'],5000000)->>'status';
select public.guarantee_claim_file_as('00000000-0000-0000-0000-00000000000a',:'ag',array['kitchen'],'The kitchen tap leaks badly and the cooker does not light at all.','{}',5000000)->>'claim_id' claim \gset
\echo '21. approve more than the reserve holds ->'
select public.admin_decide_guarantee_claim(:'claim','approve',5000000)::text;
\echo '22. approve within the reserve ->'
select public.admin_decide_guarantee_claim(:'claim','approve',3000000)->>'status';
select private.guarantee_reserve_balance() reserve_after;
\echo '23. the reserve cannot be edited ->'
do $$ begin update public.guarantee_reserve_entries set amount_minor = 1; raise notice 'WRONGLY ALLOWED'; exception when others then raise notice 'refused: %', sqlerrm; end $$;
\echo '24. a second claim larger than what is left in the reserve ->'
select public.guarantee_claim_file_as('00000000-0000-0000-0000-00000000000b',:'ag',array['safety'],'The front gate lock was broken on the day we handed over the keys.','{}',400000)->>'claim_id' claim2 \gset
select public.admin_decide_guarantee_claim(:'claim2','approve',400000)->>'status';
\echo '25. the claimant decides their own claim ->'
insert into public.user_roles values ('00000000-0000-0000-0000-00000000000b','admin');
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
select public.admin_decide_guarantee_claim(:'claim2','approve',100000)->>'status';
\echo '26. outside the window ->'
update public.deal_agreements set terms = jsonb_set(terms,'{move_in}',to_jsonb(current_date-5));
select public.guarantee_claim_file_as('00000000-0000-0000-0000-00000000000a',:'ag',array['kitchen'],'The kitchen tap leaks badly and the cooker does not light at all.','{}',100)->>'status';
\echo '27. unknown charge taken by the processor ->'
select private.settle_booking_charge('rm-unknown',5000,0,'00000000-0000-0000-0000-0000000000b1')->>'outcome';
