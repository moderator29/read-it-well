import type { Metadata } from "next";
import { StartCarousel } from "./StartCarousel";

export const metadata: Metadata = {
  title: "Welcome to Vallo",
  /*
   * Not indexed, deliberately. This is a doorway on the way to sign up, not a
   * destination, and a search result landing somebody here rather than on the
   * landing page or a property costs them a step for nothing.
   */
  robots: { index: false, follow: true },
};

/**
 * The intro, shown when somebody presses Sign up.
 *
 * A server component that renders one client component, which is the smallest
 * amount of JavaScript this can be: the slides are static, only the index is
 * stateful, and nothing here needs the session or the database.
 */
export default function StartPage() {
  return <StartCarousel />;
}
