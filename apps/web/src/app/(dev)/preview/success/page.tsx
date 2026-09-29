/* Screenshot harness for the success sheet (docs/SUCCESS_MOMENTS.md): the
   real `SuccessSheet`, open, over a page. `?v=success` (a settled stay
   payment with amount and reference), `submitted` (a listing in review) or
   `approved` (a listing live); add `&still=1` to draw the final frame with no
   animation. Closed outside development by the preview layout's own guard. */
import { Preview } from "./Preview";

export default async function Page({ searchParams }: { searchParams: Promise<{ v?: string; still?: string }> }) {
  const { v = "success", still } = await searchParams;
  const variant = v === "submitted" || v === "approved" ? v : "success";
  return <Preview variant={variant} still={still === "1"} />;
}
