"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { Table, THead, TBody, TR, TH, TD, TableKebab } from "@/components/ui/Table";
import { Progress } from "@/components/ui/Progress";
import { ActionBar } from "@/components/ui/ActionBar";
import { StatusPill, toneForStatus } from "@/components/ui/StatusPill";
import { Switch } from "@/components/ui/Switch";
import { PageHeader } from "@/components/app/PageHeader";
import { RowGlyph, Surface } from "@/components/app/Screen";
import { PageHeaderSkeleton } from "@/components/app/ScreenSkeleton";
import { UiIcon } from "@/design-system/icons/UiIcon";

/*
 * The queue rows are fixtures: invented identifiers and the catalogue's
 * fictional names, never a real person. Money is never shown here, so nothing
 * needs formatMoney; the action bar's figure below is a placeholder string
 * for the look only.
 */
const ROWS = [
  { id: "VL-1024", type: "Listing", title: "Luxury 2 Bedroom Apartment", status: "IN_REVIEW", when: "Apr 28" },
  { id: "VL-1023", type: "Booking", title: "Chinedu Okafor", status: "PENDING", when: "Apr 28" },
  { id: "VL-1022", type: "User", title: "Tunde Adebayo", status: "APPROVED", when: "Apr 28" },
  { id: "VL-1021", type: "Payment", title: "Card Upgrade", status: "COMPLETED", when: "Apr 27" },
  { id: "VL-1016", type: "Listing", title: "Cosy 1 Bedroom Apartment", status: "REJECTED", when: "Apr 26" },
];

const STATUS_WORD: Record<string, string> = {
  IN_REVIEW: "In Review",
  PENDING: "Pending",
  APPROVED: "Approved",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

export function SurfacesPreview({ sheetOpen = false }: { sheetOpen?: boolean }) {
  const [open, setOpen] = useState(sheetOpen);
  const [pool, setPool] = useState(true);
  const [type, setType] = useState("all");

  return (
    <main className="nf-shell bg-[var(--nf-surface-canvas)] pb-5xl pt-md">
      <PageHeader
        layout="stacked"
        title="Admin Queue"
        subtitle="Review and manage incoming requests, listings and user activity."
        fallback="/preview/g1"
        actions={
          <button type="button" aria-label="Settings" className="nf-icon-btn nf-icon-btn--glass">
            <UiIcon name="settings-gear" size={20} />
          </button>
        }
      />

      <Table caption="Queue" density="dense" tone="glass" maxHeight="15rem">
        <THead>
          <TR>
            <TH>ID</TH>
            <TH>Type</TH>
            <TH>Title</TH>
            <TH>Status</TH>
            <TH align="end">Sent</TH>
            <TH>
              <span className="sr-only">Actions</span>
            </TH>
          </TR>
        </THead>
        <TBody>
          {ROWS.map((row) => (
            <TR key={row.id}>
              <TD role="id">{row.id}</TD>
              <TD>{row.type}</TD>
              <TD className="max-w-[9rem] truncate text-[var(--nf-content-primary)]">{row.title}</TD>
              <TD>
                <StatusPill tone={toneForStatus(row.status)} outlined mark="dot" size="sm" shape="pill">
                  {STATUS_WORD[row.status]}
                </StatusPill>
              </TD>
              <TD align="end">{row.when}</TD>
              <TD role="kebab">
                <TableKebab label={`More actions for ${row.id}`} />
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <div className="mt-group">
        <Progress
          label="Inspection checklist"
          material="glass"
          value={4}
          max={7}
          showValue
          valueText="4 of 7"
        />
      </div>

      <Surface tone="glass" className="mt-group">
        <div className="flex items-center gap-row">
          <RowGlyph icon="user" />
          <div className="min-w-0 flex-1">
            <p className="nf-body font-semibold text-[var(--nf-content-primary)]">Account Information</p>
            <p className="nf-body-sm text-[var(--nf-content-muted)]">Name, email, phone number</p>
          </div>
          <StatusPill tone="brand" mark="dot" size="sm" shape="pill">
            Verified
          </StatusPill>
        </div>
        <div className="mt-sm flex items-center gap-row">
          <RowGlyph icon="bell" />
          <div className="min-w-0 flex-1">
            <p className="nf-body font-semibold text-[var(--nf-content-primary)]">Notifications</p>
            <p className="nf-body-sm text-[var(--nf-content-muted)]">Push, email, in-app</p>
          </div>
          <Switch aria-label="Notifications" checked={pool} onCheckedChange={setPool} />
        </div>
      </Surface>

      <div className="mt-group flex items-start gap-row">
        <Skeleton glass circle width="2.75rem" />
        <div className="min-w-0 flex-1">
          <SkeletonText lines={2} />
        </div>
      </div>
      <PageHeaderSkeleton layout="stacked" subtitle />

      <Button className="mt-group" variant="glass" onClick={() => setOpen(true)}>
        Open the filter sheet
      </Button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Filters"
        closeLabel="Close filters"
        detents={[0.86]}
        reset={{ label: "Reset", onClick: () => setType("all") }}
        apply={{ label: "Apply", onClick: () => setOpen(false) }}
      >
        <p className="nf-body-sm font-semibold text-[var(--nf-content-primary)]">Property Type</p>
        <div className="mt-xs flex flex-wrap gap-inline">
          {["all", "house", "apartment", "duplex", "terrace", "land"].map((value) => (
            <Chip
              key={value}
              behaviour="choice"
              size="sm"
              selected={type === value}
              onSelectedChange={() => setType(value)}
            >
              {value === "all" ? "All" : value[0]!.toUpperCase() + value.slice(1)}
            </Chip>
          ))}
        </div>
        <p className="mt-group nf-body-sm font-semibold text-[var(--nf-content-primary)]">Amenities</p>
        <Switch className="mt-xs" label="Swimming Pool" checked={pool} onCheckedChange={setPool} />
        <Switch className="mt-xs" label="Gym" checked onCheckedChange={() => {}} />
      </Sheet>

      <ActionBar glow leading={{ figure: "Move-in total", label: "Per year" }}>
        <Button variant="glass" leadingIcon="document">
          Breakdown
        </Button>
        <Button variant="primary" glow leadingIcon="calendar-booking">
          Book Inspection
        </Button>
      </ActionBar>
    </main>
  );
}
