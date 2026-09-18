import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";

/**
 * The two tables and one column M12 added, typed here until
 * `database.types.ts` is regenerated. Same shape and same reason as
 * lib/messages/db.ts: describe exactly what the migration added, hand back the
 * same client, delete this file when the generated types catch up.
 */

export type PaymentMethodRow = {
  id: string;
  user_id: string;
  provider: string;
  authorization_code: string;
  signature: string;
  card_type: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  bin: string | null;
  bank: string | null;
  channel: string | null;
  reusable: boolean;
  is_default: boolean;
  email_used: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentMethodsTable = {
  Row: PaymentMethodRow;
  Insert: Omit<PaymentMethodRow, "id" | "created_at" | "updated_at" | "provider" | "is_default" | "deleted_at"> &
    Partial<Pick<PaymentMethodRow, "id" | "created_at" | "updated_at" | "provider" | "is_default" | "deleted_at">>;
  Update: Partial<PaymentMethodRow>;
  Relationships: [];
};

export type BankAccountRow = {
  id: string;
  user_id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  resolved_account_name: string;
  resolved_at: string;
  recipient_code: string | null;
  is_default: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BankAccountsTable = {
  Row: BankAccountRow;
  Insert: Omit<BankAccountRow, "id" | "created_at" | "updated_at" | "recipient_code" | "is_default" | "deleted_at"> &
    Partial<Pick<BankAccountRow, "id" | "created_at" | "updated_at" | "recipient_code" | "is_default" | "deleted_at">>;
  Update: Partial<BankAccountRow>;
  Relationships: [];
};

type GeneratedPayout = Database["public"]["Tables"]["payout_accounts"];

export type PayoutAccountsTable = {
  Row: GeneratedPayout["Row"] & { recipient_code: string | null };
  Insert: GeneratedPayout["Insert"] & { recipient_code?: string | null };
  Update: GeneratedPayout["Update"] & { recipient_code?: string | null };
  Relationships: GeneratedPayout["Relationships"];
};

export type PaymentsDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Omit<Database["public"]["Tables"], "payout_accounts"> & {
      payment_methods: PaymentMethodsTable;
      bank_accounts: BankAccountsTable;
      payout_accounts: PayoutAccountsTable;
    };
  };
};

/** The same client, aware of payment_methods, bank_accounts and recipient_code. */
export function withPaymentTables(
  client: SupabaseClient<Database>,
): SupabaseClient<PaymentsDatabase> {
  return client as unknown as SupabaseClient<PaymentsDatabase>;
}
