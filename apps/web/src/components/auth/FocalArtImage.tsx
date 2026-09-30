import Image from "next/image";
import type { FocalArt } from "./focal-art";

/** One 3D object sized to the focal ring (auth.css, `.nf-slate-focal__icon`). */
export function FocalArtImage({ art }: { art: Extract<FocalArt, { kind: "object" }> }) {
  return (
    <Image
      src={art.src}
      alt=""
      width={256}
      height={256}
      sizes="80px"
      priority
      draggable={false}
      className="nf-slate-focal__icon"
      data-focal={art.name}
    />
  );
}
