import "@/app/welcome/welcome.css";

/**
 * The ground first run stands on: the render's deep navy with the blue haze
 * lifting behind the stage, drawn in `app/welcome/welcome.css` (Get started's
 * own stylesheet, so `auth.css` and `globals.css` are not touched). Shared by
 * the route and by the preview harness, so the look proven in the harness is
 * the look that ships.
 *
 * DARK ONLY. The founder removed light mode from the platform on 23
 * September; the root layout forces dark. `data-theme="dark"` stays on
 * this element only so the tokens here are dark on the day before that lands,
 * and it can go once the root no longer carries any other value.
 */
export function WelcomeStage({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="nf-gs" data-theme="dark">
      <div className="nf-gs__ground" aria-hidden="true" />
      {children}
    </main>
  );
}
