/* MACHINE DRAFT, 30 September 2026 (recommendation A11). Needs a native
   Hausa, Yoruba and Igbo speaker's review before it is called final; the
   state is recorded as data in `PUSH_TEXT_REVIEW` below, on the model of
   review-status.ts. Terms follow the locale files and the other drafts:
   Hausa "ajiya" (booking), "duba" (viewing), "mai sanarwa" (lister);
   Yoruba "ìfilọ́lẹ̀", "àyẹ̀wò", "olùkéde"; Igbo "ndebe", "nyocha",
   "onye ndepụta".

   WHAT THIS IS. The database writes every notification in English (about
   75 functions call `private.notify` or insert into `public.notifications`).
   The push drain renders the lock-screen text in the RECIPIENT's language
   from this catalogue, at send time (packages/i18n/src/push.ts). Each rule
   matches one English title exactly and its body by an anchored pattern;
   the pieces the database filled in (a listing's name, a date, an amount, a
   member's own message) are carried across unchanged as {b1}, {b2}, ...
   A title that matches with a body that does not falls back to ENGLISH FOR
   BOTH, so a lock screen never shows half one language and half another.

   Ordered by reach: messages, bookings, viewings, tables, support, security,
   social, reviews, rent. Anything not here stays English. */

import type { Locale } from "../../core";

type Translated = Exclude<Locale, "en">;

export type PushTextRule = {
  /** A stable name for tests and for the speaker's brief. */
  id: string;
  /** The English title, exactly as the database writes it. */
  title: string;
  /** The English body, anchored. `null` when the rule carries no body. */
  body: RegExp | null;
  /** Title and body per locale; {b1}.. are the body pattern's captures. */
  copy: Record<Translated, { title: string; body: string }>;
};

export const PUSH_TEXT_RULES: readonly PushTextRule[] = [
  {
    id: "message.new",
    title: "New message",
    body: /^([\s\S]*)$/,
    copy: {
      ha: { title: "Sabon saƙo", body: "{b1}" },
      yo: { title: "Ìfiránṣẹ́ tuntun", body: "{b1}" },
      ig: { title: "Ozi ọhụrụ", body: "{b1}" },
    },
  },
  {
    id: "booking.request_sent",
    title: "Booking request sent",
    body: /^Your request for (.+) is with the host\.$/,
    copy: {
      ha: { title: "An aika buƙatar ajiya", body: "Buƙatarka ta {b1} tana wurin mai masauki." },
      yo: { title: "A ti fi ìbéèrè ìfilọ́lẹ̀ ránṣẹ́", body: "Ìbéèrè rẹ fún {b1} ti dé ọ̀dọ̀ onílé." },
      ig: { title: "Ezigala arịrịọ ndebe", body: "Arịrịọ gị maka {b1} dị n'aka onye nnabata." },
    },
  },
  {
    id: "booking.new_request",
    title: "New booking request",
    body: /^(.+): (\d{2} \w{3}) to (\d{2} \w{3})\.$/,
    copy: {
      ha: { title: "Sabuwar buƙatar ajiya", body: "{b1}: {b2} zuwa {b3}." },
      yo: { title: "Ìbéèrè ìfilọ́lẹ̀ tuntun", body: "{b1}: {b2} sí {b3}." },
      ig: { title: "Arịrịọ ndebe ọhụrụ", body: "{b1}: {b2} ruo {b3}." },
    },
  },
  {
    id: "booking.confirmed",
    title: "Booking confirmed",
    body: /^(.+) is confirmed for (\d{2} \w{3})\.$/,
    copy: {
      ha: { title: "An tabbatar da ajiya", body: "An tabbatar da {b1} don {b2}." },
      yo: { title: "A ti fìdí ìfilọ́lẹ̀ múlẹ̀", body: "A ti fìdí {b1} múlẹ̀ fún {b2}." },
      ig: { title: "Akwadoro ndebe", body: "Akwadoro {b1} maka {b2}." },
    },
  },
  {
    id: "booking.cancelled_host",
    title: "Booking cancelled",
    body: /^(.+) for (\d{2} \w{3}) was cancelled\.$/,
    copy: {
      ha: { title: "An soke ajiya", body: "An soke {b1} na {b2}." },
      yo: { title: "A ti fagilé ìfilọ́lẹ̀", body: "A ti fagilé {b1} fún {b2}." },
      ig: { title: "Akagburu ndebe", body: "Akagburu {b1} maka {b2}." },
    },
  },
  {
    id: "booking.cancelled_guest",
    title: "Booking cancelled",
    body: /^(.+) has been cancelled\.$/,
    copy: {
      ha: { title: "An soke ajiya", body: "An soke {b1}." },
      yo: { title: "A ti fagilé ìfilọ́lẹ̀", body: "A ti fagilé {b1}." },
      ig: { title: "Akagburu ndebe", body: "Akagburu {b1}." },
    },
  },
  {
    id: "booking.stay_complete",
    title: "Stay complete",
    body: /^(.+) is recorded as complete\. Thank you for staying\.$/,
    copy: {
      ha: { title: "Zama ya kammala", body: "An rubuta {b1} a matsayin wanda ya kammala. Mun gode da zama." },
      yo: { title: "Ìbùgbé ti parí", body: "A ti kọ {b1} sílẹ̀ pé ó ti parí. A dúpẹ́ pé o dé sọ́dọ̀ wa." },
      ig: { title: "Obibi agwụla", body: "Edebere {b1} dị ka nke gwụchara. Daalụ maka ịnọ." },
    },
  },
  {
    id: "viewing.booked_requester",
    title: "Viewing booked",
    body: /^(.+) on (.+)\. The lister is expecting you\.$/,
    copy: {
      ha: { title: "An tsara duba", body: "{b1} a {b2}. Mai sanarwa yana jiranka." },
      yo: { title: "A ti ṣètò àyẹ̀wò", body: "{b1} ní {b2}. Olùkéde ń retí rẹ." },
      ig: { title: "Edebere nyocha", body: "{b1} na {b2}. Onye ndepụta na-atụ anya gị." },
    },
  },
  {
    id: "viewing.booked_lister",
    title: "Viewing booked",
    body: /^(.+) booked (.+) to see (.+)\.$/,
    copy: {
      ha: { title: "An tsara duba", body: "{b1} ya zaɓi {b2} don duba {b3}." },
      yo: { title: "A ti ṣètò àyẹ̀wò", body: "{b1} yan {b2} láti wo {b3}." },
      ig: { title: "Edebere nyocha", body: "{b1} debere {b2} ịhụ {b3}." },
    },
  },
  {
    id: "inspection.requested",
    title: "Inspection requested",
    body: /^(.+) wants to see (.+) on (.+)\. Confirm, offer another time, or decline\.$/,
    copy: {
      ha: { title: "An nemi duba", body: "{b1} yana son ganin {b2} a {b3}. Tabbatar, ba da wani lokaci, ko ƙi." },
      yo: { title: "Wọ́n béèrè fún àyẹ̀wò", body: "{b1} fẹ́ wo {b2} ní {b3}. Fìdí rẹ̀ múlẹ̀, dábàá àkókò míì, tàbí kọ̀ ọ́." },
      ig: { title: "A rịọrọ nyocha", body: "{b1} chọrọ ịhụ {b2} na {b3}. Kwado ya, nye oge ọzọ, ma ọ bụ jụ ya." },
    },
  },
  {
    id: "inspection.confirmed",
    title: "Inspection confirmed",
    body: /^(.+) on (.+)\. The lister is expecting you\.$/,
    copy: {
      ha: { title: "An tabbatar da duba", body: "{b1} a {b2}. Mai sanarwa yana jiranka." },
      yo: { title: "A ti fìdí àyẹ̀wò múlẹ̀", body: "{b1} ní {b2}. Olùkéde ń retí rẹ." },
      ig: { title: "Akwadoro nyocha", body: "{b1} na {b2}. Onye ndepụta na-atụ anya gị." },
    },
  },
  {
    id: "inspection.another_time",
    title: "Another time offered",
    body: /^The lister of (.+) can do (.+) instead\. Accept it, or reply in the thread\.$/,
    copy: {
      ha: {
        title: "An ba da wani lokaci",
        body: "Mai sanarwar {b1} zai iya {b2} maimakon haka. Karɓa, ko ka amsa a cikin tattaunawar.",
      },
      yo: {
        title: "Wọ́n dábàá àkókò míì",
        body: "Olùkéde {b1} lè ṣe {b2} dípò bẹ́ẹ̀. Gbà á, tàbí fèsì nínú ìjíròrò náà.",
      },
      ig: {
        title: "E nyere oge ọzọ",
        body: "Onye ndepụta {b1} nwere ike ime {b2} kama. Nabata ya, ma ọ bụ zaa na mkparịta ụka ahụ.",
      },
    },
  },
  {
    id: "inspection.complete_requester",
    title: "Inspection complete",
    body: /^Your visit to (.+) is recorded as done\.$/,
    copy: {
      ha: { title: "Duba ya kammala", body: "An rubuta ziyararka zuwa {b1} a matsayin an gama." },
      yo: { title: "Àyẹ̀wò ti parí", body: "A ti kọ ìbẹ̀wò rẹ sí {b1} sílẹ̀ pé ó ti parí." },
      ig: { title: "Nyocha agwụla", body: "Edebere nleta gị na {b1} dị ka emechara." },
    },
  },
  {
    id: "table.confirmed",
    title: "Your table is confirmed",
    body: /^(.+) is expecting (\d+) guests? on (.+)\.$/,
    copy: {
      ha: { title: "An tabbatar da teburinka", body: "{b1} yana jiran baƙi {b2} a {b3}." },
      yo: { title: "A ti fìdí tábìlì rẹ múlẹ̀", body: "{b1} ń retí àlejò {b2} ní {b3}." },
      ig: { title: "Akwadoro tebụl gị", body: "{b1} na-atụ anya ndị ọbịa {b2} na {b3}." },
    },
  },
  {
    id: "support.replied",
    title: "Support replied",
    body: /^Ticket (\S+) has a new reply\.$/,
    copy: {
      ha: { title: "Tallafi ya amsa", body: "Tikiti {b1} yana da sabuwar amsa." },
      yo: { title: "Ìrànlọ́wọ́ ti fèsì", body: "Tíkẹ́ẹ̀tì {b1} ní èsì tuntun." },
      ig: { title: "Enyemaka zara", body: "Tiketi {b1} nwere nzaghachi ọhụrụ." },
    },
  },
  {
    id: "security.new_sign_in",
    title: "New sign-in to Vallo",
    body: /^(.+) signed in to your account\. Was this you\? If not, open this and tap This was not me\.$/,
    copy: {
      ha: { title: "Sabuwar shiga Vallo", body: "{b1} ya shiga asusunka. Kai ne? Idan ba kai ba ne, buɗe wannan ka faɗa mana." },
      yo: { title: "Wíwọlé tuntun sí Vallo", body: "{b1} wọlé sí àkọọ́lẹ̀ rẹ. Ṣé ìwọ ni? Tí kì í bá ṣe ìwọ, ṣí èyí kí o sọ fún wa." },
      ig: { title: "Mbanye ọhụrụ na Vallo", body: "{b1} banyere n'akaụntụ gị. Ọ bụ gị? Ọ bụrụ na ọ bụghị gị, mepee nke a gwa anyị." },
    },
  },
  {
    id: "social.new_follower",
    title: "New follower",
    body: /^@(\S+) started following you\.$/,
    copy: {
      ha: { title: "Sabon mai bin ka", body: "@{b1} ya fara bin ka." },
      yo: { title: "Olùtẹ̀lé tuntun", body: "@{b1} bẹ̀rẹ̀ sí í tẹ̀lé ọ." },
      ig: { title: "Onye na-eso gị ọhụrụ", body: "@{b1} malitere iso gị." },
    },
  },
  {
    id: "review.new",
    title: "New review",
    body: /^A guest rated (.+) (\d) out of 5\.$/,
    copy: {
      ha: { title: "Sabon bita", body: "Wani baƙo ya ba {b1} maki {b2} cikin 5." },
      yo: { title: "Àgbéyẹ̀wò tuntun", body: "Àlejò kan fún {b1} ní {b2} nínú 5." },
      ig: { title: "Ntule ọhụrụ", body: "Otu onye ọbịa nyere {b1} {b2} n'ime 5." },
    },
  },
  {
    id: "review.host_answered",
    title: "The host answered your review",
    body: /^Your review of (.+) has a reply\.$/,
    copy: {
      ha: { title: "Mai masauki ya amsa bitarka", body: "Bitarka ta {b1} tana da amsa." },
      yo: { title: "Onílé ti fèsì sí àgbéyẹ̀wò rẹ", body: "Àgbéyẹ̀wò rẹ nípa {b1} ní èsì." },
      ig: { title: "Onye nnabata zara ntule gị", body: "Ntule gị maka {b1} nwere nzaghachi." },
    },
  },
  {
    id: "rent.paid",
    title: "Rent paid",
    body: /^(.+): the move-in total is paid and recorded to the kobo\.$/,
    copy: {
      ha: { title: "An biya haya", body: "{b1}: an biya jimlar kuɗin shiga kuma an rubuta shi har zuwa kobo." },
      yo: { title: "A ti san owó ilé", body: "{b1}: a ti san àpapọ̀ owó ìwọlé, a sì ti kọ ọ́ sílẹ̀ dé kọ́bọ̀." },
      ig: { title: "Akwụọla ụgwọ ụlọ", body: "{b1}: akwụọla ngụkọta ego mbata ma dekọọ ya ruo kobo." },
    },
  },
  {
    id: "booking.refund_on_its_way",
    title: "Refund on its way",
    body: /^(NGN [\d,]+\.\d{2}) for (.+) is being returned to the card or account you paid with\. Banks usually show it within 5 to 10 working days\.$/,
    copy: {
      ha: {
        title: "Kuɗin mayarwa yana hanya",
        body: "Ana mayar da {b1} na {b2} zuwa katin ko asusun da ka biya da shi. Bankuna kan nuna shi cikin kwanakin aiki 5 zuwa 10.",
      },
      yo: {
        title: "Owó ìdápadà ń bọ̀",
        body: "À ń dá {b1} fún {b2} padà sí káàdì tàbí àkọọ́lẹ̀ tí o fi sanwó. Àwọn báńkì sábà máa ń fi hàn láàárín ọjọ́ iṣẹ́ 5 sí 10.",
      },
      ig: {
        title: "Nkwụghachi ego na-abịa",
        body: "A na-akwụghachi {b1} maka {b2} na kaadị ma ọ bụ akaụntụ i ji kwụọ ụgwọ. Ụlọ akụ na-egosikarị ya n'ime ụbọchị ọrụ 5 ruo 10.",
      },
    },
  },
  /* 13 October 2026, track/notifications: the notices migrations nt02 to nt05
     write. Same machine-draft state as the rest of this file. */
  {
    id: "payment.received_guest",
    title: "Payment received",
    body: /^(.+): (NGN [\d,]+\.\d{2}) is paid\. Your booking is confirmed\.$/,
    copy: {
      ha: { title: "An karɓi biyan kuɗi", body: "{b1}: an biya {b2}. An tabbatar da ajiyarka." },
      yo: { title: "A ti gba owó rẹ", body: "{b1}: a ti san {b2}. A ti fìdí ìfilọ́lẹ̀ rẹ múlẹ̀." },
      ig: { title: "Anabatala ụgwọ", body: "{b1}: akwụọla {b2}. Akwadoro ndebe gị." },
    },
  },
  {
    id: "payment.received_host_share",
    title: "Payment received",
    body: /^(.+) for (\d{2} \w{3}) to (\d{2} \w{3}) is paid\. Your share, (NGN [\d,]+\.\d{2}), goes straight to the bank account on your payout details\.$/,
    copy: {
      ha: { title: "An karɓi biyan kuɗi", body: "An biya {b1} na {b2} zuwa {b3}. Kason ka, {b4}, zai tafi kai tsaye zuwa asusun bankinka." },
      yo: { title: "A ti gba owó rẹ", body: "A ti san owó fún {b1}, {b2} sí {b3}. Ìpín rẹ, {b4}, lọ taara sí àkọọ́lẹ̀ báńkì rẹ." },
      ig: { title: "Anabatala ụgwọ", body: "Akwụọla ụgwọ maka {b1}, {b2} ruo {b3}. Òkè gị, {b4}, na-aga ozugbo n'akaụntụ ụlọ akụ gị." },
    },
  },
  {
    id: "payment.received_host",
    title: "Payment received",
    body: /^(.+) for (\d{2} \w{3}) to (\d{2} \w{3}) is paid\.$/,
    copy: {
      ha: { title: "An karɓi biyan kuɗi", body: "An biya {b1} na {b2} zuwa {b3}." },
      yo: { title: "A ti gba owó rẹ", body: "A ti san owó fún {b1}, {b2} sí {b3}." },
      ig: { title: "Anabatala ụgwọ", body: "Akwụọla ụgwọ maka {b1}, {b2} ruo {b3}." },
    },
  },
  {
    id: "stay.checkin_eve",
    title: "Check-in tomorrow",
    body: /^(.+): you check in on (.+)\. Open your booking for the arrival details\.$/,
    copy: {
      ha: { title: "Shigowa gobe", body: "{b1}: za ka shiga ranar {b2}. Buɗe ajiyarka don ganin bayanan isowa." },
      yo: { title: "Ìwọlé ni ọ̀la", body: "{b1}: o máa wọlé ní {b2}. Ṣí ìfilọ́lẹ̀ rẹ láti rí ìsọfúnni dídé." },
      ig: { title: "Mbata echi", body: "{b1}: ị ga-abata na {b2}. Meghee ndebe gị ka ị hụ ozi oge ọbịbịa." },
    },
  },
  {
    id: "stay.checkin_day",
    title: "Check-in today",
    body: /^(.+): check-in is today\. Open your booking for the arrival details\.$/,
    copy: {
      ha: { title: "Shigowa yau", body: "{b1}: shigowa yau ne. Buɗe ajiyarka don ganin bayanan isowa." },
      yo: { title: "Ìwọlé ni òní", body: "{b1}: ìwọlé ni òní. Ṣí ìfilọ́lẹ̀ rẹ láti rí ìsọfúnni dídé." },
      ig: { title: "Mbata taa", body: "{b1}: taa bụ ụbọchị mbata. Meghee ndebe gị ka ị hụ ozi oge ọbịbịa." },
    },
  },
  {
    id: "stay.host_arrival_day",
    title: "A guest arrives today",
    body: /^(.+) arrives today at (.+)\.$/,
    copy: {
      ha: { title: "Baƙo yana zuwa yau", body: "{b1} zai iso yau a {b2}." },
      yo: { title: "Àlejò máa dé lónìí", body: "{b1} máa dé lónìí ní {b2}." },
      ig: { title: "Onye ọbịa ga-abịa taa", body: "{b1} ga-abịa taa na {b2}." },
    },
  },
  {
    id: "stay.checkout_day",
    title: "Check-out today",
    body: /^(.+): today is your check-out day\. Open your booking if you need to message the host\.$/,
    copy: {
      ha: { title: "Fita yau", body: "{b1}: yau ne ranar fitarka. Buɗe ajiyarka idan kana son aika wa mai masauki saƙo." },
      yo: { title: "Ìjáde ni òní", body: "{b1}: òní ni ọjọ́ ìjáde rẹ. Ṣí ìfilọ́lẹ̀ rẹ tí o bá fẹ́ fi ìfiránṣẹ́ ránṣẹ́ sí onílé." },
      ig: { title: "Ọpụpụ taa", body: "{b1}: taa bụ ụbọchị ọpụpụ gị. Meghee ndebe gị ma ịchọrọ izi onye nnabata ozi." },
    },
  },
  {
    id: "stay.review_request",
    title: "How was your stay?",
    body: /^Tell other guests what it was like at (.+)\. It takes a minute\.$/,
    copy: {
      ha: { title: "Yaya zamanka ya kasance?", body: "Gaya wa sauran baƙi yadda {b1} yake. Minti ɗaya kawai." },
      yo: { title: "Báwo ni ìgbà tí o dé?", body: "Sọ fún àwọn àlejò mìíràn bí {b1} ṣe rí. Ó gba ìṣẹ́jú kan." },
      ig: { title: "Olee otú nnọkọ gị dị?", body: "Gwa ndị ọbịa ndị ọzọ ka {b1} dị. Ọ na-ewe nkeji otu." },
    },
  },
  {
    id: "table.review_request",
    title: "How was your meal?",
    body: /^Rate your table at (.+)\. It takes a minute and helps other diners choose\.$/,
    copy: {
      ha: { title: "Yaya abincin ya kasance?", body: "Ba da ƙima ga teburinka a {b1}. Minti ɗaya ne kuma yana taimaka wa sauran masu cin abinci su zaɓa." },
      yo: { title: "Báwo ni oúnjẹ rẹ?", body: "Fún tábìlì rẹ ní {b1} ní ìdíwọ̀n. Ó gba ìṣẹ́jú kan, ó sì ń ran àwọn onjẹ mìíràn lọ́wọ́ láti yàn." },
      ig: { title: "Olee nri gị dị?", body: "Nye tebụl gị na {b1} ọkwa. Ọ na-ewe nkeji otu ma na-enyere ndị ọzọ na-eri nri aka ịhọrọ." },
    },
  },
  {
    id: "referral.joined",
    title: "Someone joined with your invite",
    body: /^They need to finish a few steps, such as confirming a phone number, before the invite counts\. We will tell you when it does\.$/,
    copy: {
      ha: { title: "Wani ya shiga da gayyatarka", body: "Yana buƙatar kammala wasu matakai, kamar tabbatar da lambar waya, kafin gayyatar ta ƙidayu. Za mu gaya maka idan ta ƙidayu." },
      yo: { title: "Ẹnìkan darapọ̀ mọ́ ìkésíni rẹ", body: "Wọ́n gbọ́dọ̀ parí àwọn ìgbésẹ̀ díẹ̀, bíi ìmúdájú nọ́mbà fóònù, kí ìkésíni tó ṣiṣẹ́. A ó sọ fún ọ nígbà tí ó bá ṣiṣẹ́." },
      ig: { title: "Mmadụ sonyere site n'oku gị", body: "Ha kwesịrị imecha ụfọdụ usoro, dị ka ịkwado nọmba ekwentị, tupu oku ahụ guzosie. Anyị ga-agwa gị mgbe ọ gụsiri." },
    },
  },
  {
    id: "referral.counts",
    title: "Your invite counts",
    body: /^(NGN [\d,]+\.\d{2}) is waiting out its review period\. We will tell you when it is available\.$/,
    copy: {
      ha: { title: "Gayyatarka ta ƙidayu", body: "{b1} yana jiran lokacin dubawa. Za mu gaya maka idan ya samu." },
      yo: { title: "Ìkésíni rẹ ṣiṣẹ́", body: "{b1} ń dúró de àkókò àyẹ̀wò. A ó sọ fún ọ nígbà tí ó bá wà." },
      ig: { title: "Oku gị gụsiri", body: "{b1} na-eche oge nlele. Anyị ga-agwa gị mgbe ọ dị." },
    },
  },
  {
    id: "referral.available",
    title: "Your referral reward is available",
    body: /^(NGN [\d,]+\.\d{2}) is ready in Rewards\.$/,
    copy: {
      ha: { title: "Kyautar gayyatarka tana nan", body: "{b1} yana shirye a Kyaututtuka." },
      yo: { title: "Ẹ̀bùn ìkésíni rẹ ti wà", body: "{b1} ti ṣetán nínú Ẹ̀bùn." },
      ig: { title: "Onyinye oku gị adịla", body: "{b1} dị njikere na Onyinye." },
    },
  },
  {
    id: "payout.sent",
    title: "Your payout is on its way",
    body: /^(NGN [\d,]+\.\d{2}) was sent to your bank account ending (\d{4})\. Banks usually show it the same day\.$/,
    copy: {
      ha: { title: "Biyanka yana hanya", body: "An aika {b1} zuwa asusun bankinka mai ƙarewa da {b2}. Bankuna kan nuna shi a rana ɗaya." },
      yo: { title: "Owó rẹ ń bọ̀", body: "A ti fi {b1} ránṣẹ́ sí àkọọ́lẹ̀ báńkì rẹ tó parí ní {b2}. Àwọn báńkì sábà máa ń fi hàn ní ọjọ́ kan náà." },
      ig: { title: "Ụgwọ gị na-abịa", body: "E zigara {b1} n'akaụntụ ụlọ akụ gị nke na-ejedebe na {b2}. Ụlọ akụ na-egosikarị ya n'otu ụbọchị." },
    },
  },
  {
    id: "payout.arrived",
    title: "Your payout arrived",
    body: /^(NGN [\d,]+\.\d{2}) reached your bank account ending (\d{4})\.$/,
    copy: {
      ha: { title: "Biyanka ya isa", body: "{b1} ya isa asusun bankinka mai ƙarewa da {b2}." },
      yo: { title: "Owó rẹ ti dé", body: "{b1} ti dé àkọọ́lẹ̀ báńkì rẹ tó parí ní {b2}." },
      ig: { title: "Ụgwọ gị abịala", body: "{b1} ruru akaụntụ ụlọ akụ gị nke na-ejedebe na {b2}." },
    },
  },
  {
    id: "payout.failed",
    title: "Your payout did not go through",
    body: /^(NGN [\d,]+\.\d{2}) did not reach your bank account ending (\d{4})\. The reward is still yours: open Rewards to try again, or contact support\.$/,
    copy: {
      ha: { title: "Biyanka bai wuce ba", body: "{b1} bai isa asusun bankinka mai ƙarewa da {b2} ba. Kyautar har yanzu taka ce: buɗe Kyaututtuka don sake gwadawa, ko ka tuntuɓi tallafi." },
      yo: { title: "Owó rẹ kò dé", body: "{b1} kò dé àkọọ́lẹ̀ báńkì rẹ tó parí ní {b2}. Ẹ̀bùn náà ṣì jẹ́ tìrẹ: ṣí Ẹ̀bùn láti tún gbìyànjú, tàbí kàn sí ìrànlọ́wọ́." },
      ig: { title: "Ụgwọ gị agafeghị", body: "{b1} erughị akaụntụ ụlọ akụ gị nke na-ejedebe na {b2}. Onyinye ahụ ka bụ nke gị: meghee Onyinye ka ịnwaa ọzọ, ma ọ bụ kpọtụrụ nkwado." },
    },
  },
  {
    id: "security.password_changed",
    title: "Your password was changed",
    body: /^If this was you, there is nothing to do\. If it was not, open Devices to sign out other devices, then reset your password\.$/,
    copy: {
      ha: { title: "An canza kalmar sirrinka", body: "Idan kai ne, babu abin da za ka yi. Idan ba kai ba, buɗe Na'urori don fitar da sauran na'urori, sannan ka sake saita kalmar sirrinka." },
      yo: { title: "A ti yí ọ̀rọ̀ aṣínà rẹ padà", body: "Tí ìwọ ni, kò sí ohun tí o nílò láti ṣe. Tí kì í ṣe ìwọ, ṣí Àwọn ẹ̀rọ láti jáde kúrò lórí àwọn ẹ̀rọ mìíràn, lẹ́yìn náà tún ọ̀rọ̀ aṣínà rẹ ṣe." },
      ig: { title: "Agbanweela paswọọdụ gị", body: "Ọ bụrụ na ọ bụ gị, ọ nweghị ihe ị ga-eme. Ọ bụrụ na ọ bụghị gị, meghee Ngwaọrụ ka ị pụọ na ngwaọrụ ndị ọzọ, wee tọgharịa paswọọdụ gị." },
    },
  },
  {
    id: "security.phone_confirmed",
    title: "Phone number confirmed",
    body: /^The number ending (\d{4}) is now confirmed on your account\.$/,
    copy: {
      ha: { title: "An tabbatar da lambar waya", body: "Lambar da ke ƙarewa da {b1} yanzu an tabbatar da ita a asusunka." },
      yo: { title: "A ti fìdí nọ́mbà fóònù múlẹ̀", body: "A ti fìdí nọ́mbà tó parí ní {b1} múlẹ̀ lórí àkọọ́lẹ̀ rẹ." },
      ig: { title: "Akwadoro nọmba ekwentị", body: "Akwadoro nọmba na-ejedebe na {b1} na akaụntụ gị." },
    },
  },
  {
    id: "agreement.both_confirmed",
    title: "Both of you confirmed",
    body: /^(.+) is with Vallo for a check before payment opens\. We will tell you the moment it is done\.$/,
    copy: {
      ha: { title: "Ku biyu kun tabbatar", body: "{b1} yana wurin Vallo don dubawa kafin a buɗe biyan kuɗi. Za mu gaya muku da zarar an gama." },
      yo: { title: "Ẹ̀yin méjèèjì ti fìdí rẹ̀ múlẹ̀", body: "{b1} wà lọ́dọ̀ Vallo fún àyẹ̀wò kí ìsanwó tó ṣí. A ó sọ fún yín gẹ́gẹ́ bí ó ti parí." },
      ig: { title: "Unu abụọ akwadola", body: "{b1} nọ n'aka Vallo maka nlele tupu ịkwụ ụgwọ meghee. Anyị ga-agwa unu ozugbo ọ gụsịrị." },
    },
  },
  {
    id: "agreement.cancelled",
    title: "Agreement cancelled",
    body: /^The agreement for (.+) was cancelled\.$/,
    copy: {
      ha: { title: "An soke yarjejeniya", body: "An soke yarjejeniya ta {b1}." },
      yo: { title: "A ti fagilé àdéhùn", body: "A ti fagilé àdéhùn fún {b1}." },
      ig: { title: "Akagburu nkwekọrịta", body: "Akagburu nkwekọrịta maka {b1}." },
    },
  },
];

/** The drain's own summary when a backlog is folded into one push. {count} is a number. */
export const PUSH_SUMMARY: Record<Locale, string> = {
  en: "{count} things happened while you were away",
  ha: "Abubuwa {count} sun faru yayin da ba ka nan",
  yo: "Nǹkan {count} ṣẹlẹ̀ nígbà tí o kò sí",
  ig: "Ihe {count} mere mgbe ị nọghị",
};

/**
 * Review state, as data, in the shape review-status.ts uses. Moving a locale
 * to native-reviewed names the reviewer and the date in the same commit as
 * their corrections.
 */
export const PUSH_TEXT_REVIEW: Record<
  Translated,
  { state: "machine-draft"; drafted: string } | { state: "native-reviewed"; reviewer: string; reviewed: string }
> = {
  ha: { state: "machine-draft", drafted: "2026-09-30" },
  yo: { state: "machine-draft", drafted: "2026-09-30" },
  ig: { state: "machine-draft", drafted: "2026-09-30" },
};
