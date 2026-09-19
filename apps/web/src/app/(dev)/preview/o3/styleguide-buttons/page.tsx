import { ButtonSpecimens } from "@/app/(site)/styleguide/ButtonSpecimens";

/**
 * The button specimen sheet on its own, so the press behaviour and the two
 * state switches can be shot at 390 without scrolling the whole styleguide.
 */
export const dynamic = "force-dynamic";

export default function PreviewStyleguideButtons() {
  return (
    <main className="nf-shell py-section">
      <h1 className="nf-h2">Buttons</h1>
      <p className="mt-2xs text-[var(--nf-content-secondary)]">
        Press a specimen and it copies the line that draws it.
      </p>
      <div className="mt-md">
        <ButtonSpecimens />
      </div>
    </main>
  );
}
