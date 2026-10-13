import type { ReceiptModel } from "@/components/app/money/receipt-model";

/**
 * THE RECEIPT AS A FILE (ONE-PRODUCT-DECISIONS recommendation 2: "every
 * transaction's receipt can be saved as an image or a PDF and shared").
 *
 * One design, drawn from the one receipt model (`ReceiptModel`, the same
 * words in the same order as the sheet on screen and the receipt email), on
 * a canvas in the browser: no second renderer on a server, no library. The
 * PNG is the canvas; the PDF is a one-page document holding that same
 * picture (a JPEG under DCTDecode), written here in a few dozen lines rather
 * than by a dependency. Colours are the design tokens, resolved through the
 * cascade at the moment of drawing, so the file matches the theme's paper.
 *
 * Browser only. Nothing here reads or changes money; it draws what the page
 * was handed.
 */

const W = 390;

function token(name: string, fallbackVar: string): string {
  const probe = document.createElement("span");
  probe.style.color = `var(${name}, var(${fallbackVar}))`;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const colour = getComputedStyle(probe).color;
  probe.remove();
  return colour;
}

type Ink = { night: string; paper: string; inset: string; ink: string; soft: string; muted: string; hair: string; ok: string; link: string; onBrand: string };

function inks(): Ink {
  return {
    night: token("--nf-surface-canvas", "--nf-surface-primary"),
    paper: token("--nf-doc-bg", "--nf-content-on-media"),
    inset: token("--nf-doc-bg-inset", "--nf-surface-on-paper"),
    ink: token("--nf-content-on-paper", "--nf-content-on-paper"),
    soft: token("--nf-content-on-paper-secondary", "--nf-content-on-paper"),
    muted: token("--nf-content-on-paper-muted", "--nf-content-on-paper"),
    hair: token("--nf-doc-hairline", "--nf-border-on-paper"),
    ok: token("--nf-state-success", "--nf-state-success"),
    link: token("--nf-doc-accent", "--nf-brand-primary"),
    onBrand: token("--nf-content-on-brand", "--nf-content-on-brand"),
  };
}

function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (ctx.measureText(next).width > width && line) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** Lays the receipt out, drawing when `ink` is given; returns the height used. */
function layout(ctx: CanvasRenderingContext2D, r: ReceiptModel, family: string, ink: Ink | null): number {
  const pad = 28;
  const inner = W - pad * 2;
  const font = (size: number, weight = 400) => `${weight} ${size}px ${family}`;
  let y = 34;
  const text = (s: string, x: number, size: number, weight: number, colour: string, align: CanvasTextAlign = "left") => {
    ctx.font = font(size, weight);
    if (ink) {
      ctx.fillStyle = colour;
      ctx.textAlign = align;
      ctx.fillText(s, x, y);
    }
  };

  /* The seal and the kind. */
  if (ink) {
    ctx.fillStyle = ink.ok;
    ctx.beginPath();
    ctx.arc(pad + 11, y + 11, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ink.onBrand;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(pad + 6, y + 11.5);
    ctx.lineTo(pad + 9.6, y + 15);
    ctx.lineTo(pad + 16.5, y + 7.5);
    ctx.stroke();
  }
  y += 16;
  text(r.kind.toUpperCase(), pad + 32, 12, 600, ink?.soft ?? "", "left");
  y += 32;
  ctx.font = font(21, 700);
  for (const l of wrap(ctx, r.title, inner)) {
    text(l, pad, 21, 700, ink?.ink ?? "");
    y += 27;
  }
  if (r.place) {
    text(r.place, pad, 13, 400, ink?.muted ?? "");
    y += 20;
  }

  /* "You paid": the inset with the figure, the kobo set smaller. */
  y += 10;
  const boxTop = y;
  const boxH = 104;
  if (ink) {
    ctx.fillStyle = ink.inset;
    ctx.beginPath();
    ctx.roundRect(pad, boxTop, inner, boxH, 16);
    ctx.fill();
  }
  y = boxTop + 32;
  text(r.figureLabel.toUpperCase(), W / 2, 11, 600, ink?.soft ?? "", "center");
  y = boxTop + 78;
  const dot = r.figure.lastIndexOf(".");
  const hasKobo = dot > 0 && /^\.\d{2}$/.test(r.figure.slice(dot));
  const whole = hasKobo ? r.figure.slice(0, dot) : r.figure;
  const kobo = hasKobo ? r.figure.slice(dot) : "";
  ctx.font = font(38, 700);
  const ww = ctx.measureText(whole).width;
  ctx.font = font(19, 600);
  const kw = ctx.measureText(kobo).width;
  const x0 = W / 2 - (ww + kw) / 2;
  text(whole, x0, 38, 700, ink?.ink ?? "");
  text(kobo, x0 + ww, 19, 600, ink?.soft ?? "");
  y = boxTop + boxH + 26;

  /* The tear line. */
  if (ink) {
    ctx.strokeStyle = ink.hair;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = ink.night;
    ctx.beginPath();
    ctx.arc(0, y, 9, 0, Math.PI * 2);
    ctx.arc(W, y, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  y += 30;

  const row = (label: string, value: string, opts: { bold?: boolean; tick?: boolean; mono?: boolean } = {}) => {
    const size = opts.bold ? 15 : 13.5;
    ctx.font = font(size, opts.bold ? 700 : 400);
    const labelLines = wrap(ctx, label, inner * 0.45);
    ctx.font = font(size, opts.bold ? 700 : 600);
    const valueLines = wrap(ctx, value, inner * 0.52);
    const lines = Math.max(labelLines.length, valueLines.length);
    labelLines.forEach((l, i) => {
      const save = y;
      y = save + i * 19;
      text(l, pad, size, opts.bold ? 700 : 400, opts.bold ? (ink?.ink ?? "") : (ink?.soft ?? ""));
      y = save;
    });
    valueLines.forEach((l, i) => {
      const save = y;
      y = save + i * 19;
      if (opts.tick && ink && i === 0) {
        ctx.font = font(size, 600);
        const tw = ctx.measureText(l).width;
        const cx = W - pad - tw - 14;
        ctx.fillStyle = ink.link;
        ctx.beginPath();
        ctx.arc(cx, y - 5, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = ink.onBrand;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(cx - 3.2, y - 5);
        ctx.lineTo(cx - 0.8, y - 2.6);
        ctx.lineTo(cx + 3.4, y - 7.6);
        ctx.stroke();
      }
      ctx.font = opts.mono ? `600 ${size - 1}px ui-monospace, monospace` : font(size, opts.bold ? 700 : 600);
      if (ink) {
        ctx.fillStyle = opts.tick ? ink.link : ink.ink;
        ctx.textAlign = "right";
        ctx.fillText(l, W - pad, y);
      }
      y = save;
    });
    y += lines * 19 + 14;
  };

  for (const f of r.facts) row(f.label, f.value);
  for (const l of r.lines) row(l.label, l.value);
  if (ink) {
    ctx.strokeStyle = ink.hair;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, y - 10);
    ctx.lineTo(W - pad, y - 10);
    ctx.stroke();
  }
  y += 8;
  row(r.total.label, r.total.value, { bold: true });
  if (r.confirmations.length > 0 || r.reference) y += 6;
  for (const c of r.confirmations) row(c.label, c.state, { tick: true });
  if (r.reference) row(r.reference.label, r.reference.value, { mono: true });

  y += 8;
  ctx.font = font(11.5, 400);
  for (const l of wrap(ctx, r.note, inner)) {
    text(l, pad, 11.5, 400, ink?.muted ?? "");
    y += 16;
  }
  y += 18;
  text("V A L L O", W / 2, 11, 700, ink?.muted ?? "", "center");
  return y + 26;
}

/** The receipt drawn on a canvas at `scale` device pixels per point. */
export function receiptCanvas(receipt: ReceiptModel, scale = 3): HTMLCanvasElement {
  const family = getComputedStyle(document.body).fontFamily || "sans-serif";
  const measure = document.createElement("canvas").getContext("2d");
  if (!measure) throw new Error("No canvas");
  const height = Math.ceil(layout(measure, receipt, family, null));
  const edge = 10;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round((height + edge * 2) * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No canvas");
  const ink = inks();
  ctx.scale(scale, scale);
  ctx.fillStyle = ink.night;
  ctx.fillRect(0, 0, W, height + edge * 2);
  /* The paper, with the printer's zigzag at both ends. */
  ctx.fillStyle = ink.paper;
  ctx.fillRect(0, edge, W, height);
  ctx.beginPath();
  for (let x = 0; x <= W; x += 12) {
    ctx.moveTo(x, edge);
    ctx.lineTo(x + 6, edge - 6);
    ctx.lineTo(x + 12, edge);
    ctx.moveTo(x, edge + height);
    ctx.lineTo(x + 6, edge + height + 6);
    ctx.lineTo(x + 12, edge + height);
  }
  ctx.fill();
  ctx.translate(0, edge);
  layout(ctx, receipt, family, ink);
  return canvas;
}

export function canvasBlob(canvas: HTMLCanvasElement, type: "image/png" | "image/jpeg", quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No image"))), type, quality));
}

/** A one-page PDF holding the receipt's picture, sized to it. */
export async function receiptPdf(canvas: HTMLCanvasElement): Promise<Blob> {
  const jpeg = new Uint8Array(await (await canvasBlob(canvas, "image/jpeg", 0.92)).arrayBuffer());
  const pw = 420;
  const ph = Math.round((pw * canvas.height) / canvas.width);
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? enc.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (n: number, body: string | (() => void)) => {
    offsets[n] = length;
    if (typeof body === "string") push(`${n} 0 obj\n${body}\nendobj\n`);
    else {
      push(`${n} 0 obj\n`);
      body();
      push("\nendobj\n");
    }
  };
  push("%PDF-1.4\n");
  object(1, "<< /Type /Catalog /Pages 2 0 R >>");
  object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  object(4, () => {
    push(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
    push(jpeg);
    push("\nendstream");
  });
  const draw = `q ${pw} 0 0 ${ph} 0 0 cm /Im0 Do Q`;
  object(5, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
  const xref = length;
  let table = `xref\n0 6\n0000000000 65535 f \n`;
  for (let n = 1; n <= 5; n++) table += `${String(offsets[n]).padStart(10, "0")} 00000 n \n`;
  push(`${table}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

/** Hands a file to the phone's share sheet where it takes files; otherwise saves it. Returns which. */
export async function shareOrSave(blob: Blob, filename: string, title: string): Promise<"shared" | "saved" | "cancelled"> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title });
      return "shared";
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return "cancelled";
    }
  }
  saveFile(blob, filename);
  return "saved";
}

/** Saves a file through a download link (the web path; the WebView saves it too). */
export function saveFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4_000);
}
