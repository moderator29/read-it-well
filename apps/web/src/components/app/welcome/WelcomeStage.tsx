import "@/app/welcome/welcome.css";

/**
 * The ground first run stands on, drawn in `app/welcome/welcome.css` (Get
 * started's own stylesheet, so `auth.css` and `globals.css` are not touched).
 * Shared by the route and by the preview harness, so the look proven in the
 * harness is the look that ships.
 *
 * BOTH THEMES (30 September). The steps' art is its own brand-blue sky in
 * either theme, as reference 42 draws it, and fades into the page: the night
 * navy in dark (the default), the warm paper in light. So this element no
 * longer forces `data-theme="dark"`; the words and controls follow the
 * reader's theme.
 */
export function WelcomeStage({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="nf-gs">
      <div className="nf-gs__ground" aria-hidden="true" />
      {children}
    </main>
  );
}
