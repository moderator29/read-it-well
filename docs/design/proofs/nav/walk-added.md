| route | reachable | control drawn | control asked for | cold press lands | warm press lands | declared parent | verdict |
|---|---|---|---|---|---|---|---|
| `/escrow` | yes | yes | /wallet | /sign-in | - | /wallet | control correct, parent gated: settled on /sign-in |
| `/escrow/2f1d4c6e-0000-4000-8000-000000000001` | no | - | - | - | - | /escrow | NOT REACHED: not-found body served at 200 |
| `/price` | yes | yes | /home | /sign-in | - | /home | control correct, parent gated: settled on /sign-in |
| `/price/area/2f1d4c6e-0000-4000-8000-000000000002` | yes | yes | /price | /price | /price | /price | correct |
| `/sign-in` | yes | NO | - | - | - | /welcome | NO CONTROL |
| `/sign-up` | yes | NO | - | - | - | /welcome | NO CONTROL |
| `/auth/callback` | yes | NO | - | - | - | /sign-in | NO CONTROL |
| `/admin/analytics` | no | - | - | - | - | /admin | NOT REACHED: redirected to /sign-in |
| `/admin/operations` | no | - | - | - | - | /admin | NOT REACHED: redirected to /sign-in |
| `/admin/queue` | no | - | - | - | - | /admin | NOT REACHED: redirected to /sign-in |
| `/admin/settings` | no | - | - | - | - | /admin | NOT REACHED: redirected to /sign-in |
| `/admin/supply` | no | - | - | - | - | /admin | NOT REACHED: redirected to /sign-in |
| `/admin/listings/ed000000-0000-4000-8000-000000000001` | no | - | - | - | - | /admin/listings | NOT REACHED: redirected to /sign-in |
| `/preview/b1b/chooser` | yes | NO | - | - | - | /preview | NO CONTROL |
| `/preview/c1/listing-review` | yes | NO | - | - | - | /preview | NO CONTROL |
| `/preview/imgc/hotel` | yes | NO | - | - | - | /preview | NO CONTROL |
| `/preview/session-b/profile` | yes | NO | - | - | - | /preview | NO CONTROL |
| `/preview/session-b/admin/overview` | yes | NO | - | - | - | /preview | NO CONTROL |
| `/preview/session-b/admin-money/money` | yes | NO | - | - | - | /preview | NO CONTROL |
| `/preview/session-b/admin-review/kyc` | yes | NO | - | - | - | /preview | NO CONTROL |
| `/preview/f3/listing/sale` | yes | NO | - | - | - | /preview/f3/listing | NO CONTROL |
| `/preview/f3/listing` | yes | yes | /preview/f3 | /preview/f3 | /preview/f3 | /preview/f3 | correct |
