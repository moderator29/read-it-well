import type { Dictionary } from "@vallo/i18n/core";

/**
 * THE SLICES OF THE DICTIONARY THE WELCOME TOUR AND ITS QUESTION READ.
 *
 * `/welcome` handed the whole dictionary to `FirstRun` (`t={t}`), which is
 * serialised into the page's payload: about 440KB of every surface's words for
 * a screen that reads a few namespaces (W13's measurement of the auth pages
 * found the same fault; `components/auth/auth-copy.ts` is the same pattern).
 *
 * Each type is a `Pick` of what one component reads, and the component is typed
 * with it, so reading a namespace that is not here is a compile error until it
 * is added on purpose. A full `Dictionary` is still assignable to every slice,
 * so a harness or the settings page that holds the whole thing can pass it.
 * `forFirstRun` and `forInterests` are written key by key. No word changes.
 */

/** The picker labels (`components/app/place`). */
export type PickersCopy = Pick<Dictionary, "pickers">;

export const forPickers = (t: Dictionary): PickersCopy => ({ pickers: t.pickers });

/** The data-saver row's words, from `platform.lite` (`InterestChoices`). */
type LiteCopy = { platform: Pick<Dictionary["platform"], "lite"> };

/** What the interests question reads (`InterestChoices`). */
export type InterestsCopy = Pick<Dictionary, "interests"> & {
  common: Pick<Dictionary["common"], "continue">;
} & LiteCopy;

/** The optional arrival asks (`ArrivalAsks`). */
export type ArrivalAsksCopy = Pick<Dictionary, "pickers"> & {
  welcomeCards: Pick<Dictionary["welcomeCards"], "firstRun">;
  signUp: Pick<Dictionary["signUp"], "hearAbout">;
};

/** The question beat (`QuestionBeat`): its own lines plus its two children's. */
export type QuestionBeatCopy = InterestsCopy &
  ArrivalAsksCopy & {
    welcomeCards: Pick<Dictionary["welcomeCards"], "three" | "firstRun">;
  };

/** The tour's two illustrated scenes (`OnboardingScenes`). */
export type ScenesCopy = {
  welcomeCards: Pick<Dictionary["welcomeCards"], "twoWorlds" | "intro">;
};

/** Everything `FirstRun` reads, its own lines and its children's. */
export type FirstRunCopy = QuestionBeatCopy &
  ScenesCopy &
  Pick<Dictionary, "onboardingMotion"> & {
    welcomeCards: Pick<
      Dictionary["welcomeCards"],
      "three" | "firstRun" | "twoWorlds" | "intro" | "backToSignUp" | "skip"
    >;
    shape: Pick<Dictionary["shape"], "wall">;
    common: Pick<Dictionary["common"], "back" | "continue">;
  };

export function forFirstRun(t: Dictionary): FirstRunCopy {
  return {
    welcomeCards: {
      three: t.welcomeCards.three,
      firstRun: t.welcomeCards.firstRun,
      twoWorlds: t.welcomeCards.twoWorlds,
      intro: t.welcomeCards.intro,
      backToSignUp: t.welcomeCards.backToSignUp,
      skip: t.welcomeCards.skip,
    },
    onboardingMotion: t.onboardingMotion,
    interests: t.interests,
    pickers: t.pickers,
    platform: { lite: t.platform.lite },
    signUp: { hearAbout: t.signUp.hearAbout },
    shape: { wall: t.shape.wall },
    common: { back: t.common.back, continue: t.common.continue },
  };
}

/** The settings page's interests editor reads the same question and nothing else. */
export function forInterests(t: Dictionary): InterestsCopy {
  return {
    interests: t.interests,
    common: { continue: t.common.continue },
    platform: { lite: t.platform.lite },
  };
}
