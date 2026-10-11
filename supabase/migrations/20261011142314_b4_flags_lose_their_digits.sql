update public.message_flags
   set matched = repeat('•', 6) || right(matched, 4)
 where reason = 'account_number'
   and matched ~ '^\d{10}$';
