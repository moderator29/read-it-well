import "@/app/welcome/welcome.css";

/**
 * The ground first run stands on: the render's deep navy with the blue haze
 * lifting behind the stage, drawn in `app/welcome/welcome.css` (Get started's
 * own stylesheet, so `auth.css` and `globals.css` are not touched). Shared by
 * the route and by the preview harness, so the look proven in the harness is
 * the look that ships.
 *
 * `data-theme="dark"`, PERMANENTLY. The founder's rule 22 (BUILD_06 ledger
 * 12.2, restated as rule 22 in BUILD_07) names sign in, sign up AND first run:
 * they keep the dark register whatever the theme control says. `tokens.css`
 * declares the dark palette on `:root, [data-theme="dark"]`, so this element
 * and everything inside it take dark values in both themes.
 *
 * THE ATTRIBUTE IS ONLY HALF OF IT. A rule keyed on `:root[data-theme="light"]`
 * still matches inside this subtree when the document is light, so nothing on
 * this screen uses a shared class that carries a daylight rule
 * (`.nf-aurora`, `.nf-grid-veil`, `.nf-brand-icon-ground` all do), and
 * `welcome.css` holds a short daylight section that pins what a paper page
 * would otherwise repaint around it.
 */
export function WelcomeStage({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="nf-gs" data-theme="dark">
      <div className="nf-gs__ground" aria-hidden="true" />
      {children}
    </main>
  );
}
