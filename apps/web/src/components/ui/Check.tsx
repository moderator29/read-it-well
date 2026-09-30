"use client";

import { forwardRef } from "react";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";

/**
 * The checkbox and the radio (reference 55, kinds 10 and 11).
 *
 * The material is on every native input already (controls.css, "checkbox
 * and radio": a 20px rounded square or ring on the grey edge, blue when
 * checked), so any `<input type="checkbox">` on the platform draws it. These
 * two add the ROW: the label that is the 44px target, the gap, the calm grey
 * when disabled (`.nf-check`). Uncontrolled or controlled, as a native input.
 */
type CheckProps = Omit<ComponentPropsWithoutRef<"input">, "type" | "children"> & {
  children: ReactNode;
};

export const Checkbox = forwardRef(function Checkbox(
  { children, className, ...rest }: CheckProps,
  ref: Ref<HTMLInputElement>,
) {
  return (
    <label className={["nf-check", className ?? ""].filter(Boolean).join(" ")}>
      <input {...rest} ref={ref} type="checkbox" />
      <span>{children}</span>
    </label>
  );
});

export const Radio = forwardRef(function Radio(
  { children, className, ...rest }: CheckProps,
  ref: Ref<HTMLInputElement>,
) {
  return (
    <label className={["nf-check", className ?? ""].filter(Boolean).join(" ")}>
      <input {...rest} ref={ref} type="radio" />
      <span>{children}</span>
    </label>
  );
});
