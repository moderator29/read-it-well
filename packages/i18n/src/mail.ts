/**
 * The English mail copy on its own, for the email builders (A11).
 *
 * A builder is imported by client code too (the "What everyone gets"
 * preview), so it cannot import the whole package and ship every language to
 * the browser. It takes the words it needs as data (`MailCopy`), English by
 * default from here; a server caller hands it `getDictionary(locale).mail`.
 */
import { mailEn } from "./locales/mail.en";

export { mailEn };
export type MailCopy = typeof mailEn;
