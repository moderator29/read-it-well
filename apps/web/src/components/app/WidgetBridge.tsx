"use client";

import { useEffect } from "react";
import { handWidgetToken } from "@/lib/native/widget";
import { mintWidgetToken } from "@/lib/native/widget-actions";

/**
 * V-98: in the native app, once, hands the home-screen widget its token.
 * Does nothing on the web, and nothing until the native widget exists.
 */
export function WidgetBridge() {
  useEffect(() => {
    void handWidgetToken(() => mintWidgetToken("This phone"));
  }, []);
  return null;
}
