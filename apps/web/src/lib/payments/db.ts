import type { Database } from "../supabase/database.types";

/** The M12 rows, as the generated types describe them. */
export type PaymentMethodRow = Database["public"]["Tables"]["payment_methods"]["Row"];
export type BankAccountRow = Database["public"]["Tables"]["bank_accounts"]["Row"];
