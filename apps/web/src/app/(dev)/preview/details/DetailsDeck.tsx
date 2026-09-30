"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField, TextArea } from "@/components/ui/Field";
import { NairaField } from "@/components/ui/NairaField";
import { PhoneField } from "@/components/app/PhoneField";
import { PullToRefresh } from "@/components/ui/PullToRefresh";
import { toast } from "@/lib/ui/toast";
import { useCopyFlash } from "@/lib/ui/use-copy";
import { useDoneFlash } from "@/lib/ui/use-done-flash";

export function DetailsDeck() {
  const [saving, setSaving] = useState(false);
  const [done, flash] = useDoneFlash();
  const [copied, copy] = useCopyFlash();
  const [rent, setRent] = useState("1500000");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("Two bedroom flat in Yaba, close to the train.");
  return (
    <PullToRefresh onRefresh={() => new Promise((r) => setTimeout(r, 900))}>
      <div className="mt-md flex flex-col gap-md">
        <div className="flex flex-wrap gap-sm">
          <Button variant="secondary" onClick={() => toast("Link copied")} data-testid="t-neutral">Neutral toast</Button>
          <Button variant="secondary" onClick={() => toast.success("Saved to your shortlist")} data-testid="t-success">Success toast</Button>
          <Button variant="secondary" onClick={() => toast.error("That did not go through. Try again.")} data-testid="t-error">Error toast</Button>
          <Button
            variant="secondary"
            onClick={() => toast("Hidden on this phone", { action: { label: "Undo", run: () => toast.success("Back in your results") } })}
            data-testid="t-undo"
          >
            Undo toast
          </Button>
        </div>
        <form
          className="flex flex-col gap-md"
          onSubmit={(e) => {
            e.preventDefault();
            setSaving(true);
            window.setTimeout(() => {
              setSaving(false);
              flash();
            }, 700);
          }}
        >
          <TextField
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            data-testid="f-email"
            validate={(v) => (v && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) ? "Enter an email address like ade@example.com." : null)}
          />
          <NairaField label="Yearly rent" value={rent} onValueChange={setRent} data-testid="f-rent" />
          <PhoneField name="phone" label="Phone" value={phone} onChange={setPhone} />
          <TextArea label="About the place" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={60} rows={3} />
          <div className="flex gap-sm">
            <Button type="submit" variant="primary" loading={saving} done={done} data-testid="f-save">
              Save
            </Button>
            <Button type="button" variant="secondary" leadingIcon="link" done={copied} onClick={() => void copy("https://vallo.ng/s/abc")}>
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </form>
      </div>
    </PullToRefresh>
  );
}
