import Image from "next/image";

/**
 * The ground the first run stands on: the aurora plate behind a centred
 * column, the same ground as the auth family, so the door and the first
 * screen after it read as one place. Shared by the route and by the preview
 * harness so the look proven in the harness is the look that ships.
 *
 * `data-theme="dark"`, for the same reason `app/(auth)/layout.tsx` carries
 * it: the auth family is dark in BOTH themes, permanently (ledger rule 22),
 * and the ruling names first run alongside sign in and sign up. It is the
 * screen immediately after the door and it stands on the same `.nf-auth`
 * ground, so a paper twin here would change the register halfway through a
 * sequence the reader experiences as one. `tokens.css` declares the dark
 * palette on `:root, [data-theme="dark"]`, so this element and everything
 * inside it take dark values whatever the document is set to.
 *
 * THE ATTRIBUTE IS ONLY HALF OF IT. It pins the tokens; it does not stop a
 * rule keyed on `:root[data-theme="light"] .nf-welcome__x` from matching
 * when the document really is light. That is why `auth.css` carries no
 * light rules for this family at all, and why adding one back would break
 * the ruling rather than complete it.
 */
export function WelcomeStage({ children }: { children: React.ReactNode }) {
  return (
    <main id="main" className="nf-auth" data-theme="dark">
      <div className="nf-auth__plate" aria-hidden="true">
        <Image src="/brand/photos/bg-blue-wave.jpg" alt="" fill sizes="100vw" priority />
      </div>
      <div className="nf-aurora" aria-hidden="true" />
      <div className="nf-grid-veil" aria-hidden="true" />
      {children}
    </main>
  );
}
