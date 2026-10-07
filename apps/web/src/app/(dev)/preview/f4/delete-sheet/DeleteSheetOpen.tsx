"use client";

import { useState } from "react";
import { DELETE_WORDS, DeleteSheet } from "@/components/social/DeleteSheet";

/** The sheet, open on arrival. Its confirm deletes nothing: it resolves after a beat. */
export function DeleteSheetOpen() {
  const [open, setOpen] = useState(true);
  return (
    <DeleteSheet
      open={open}
      title={DELETE_WORDS.post.title}
      body={DELETE_WORDS.post.body}
      onClose={() => setOpen(false)}
      onConfirm={() => new Promise<boolean>((resolve) => window.setTimeout(() => resolve(true), 600))}
    />
  );
}
