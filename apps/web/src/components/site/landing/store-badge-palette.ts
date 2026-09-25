/**
 * THE STORE BADGES' OWN COLOURS, and the one place in the landing that is
 * allowed literals.
 *
 * These are not Vallo's colours and no theme may touch them: Apple's badge is
 * black with a grey keyline and white type, and Google's play triangle is its
 * four fixed colours. Both stores' guidelines forbid recolouring the artwork,
 * so a token that could follow the theme would be the wrong tool. One line,
 * one exemption, drawn by `StoreBadges.tsx`.
 */
// eslint-disable-next-line nf/no-raw-colour -- Apple's and Google's badge artwork, which their guidelines forbid recolouring.
export const BADGE = { ink: "#000000", rim: "#a6a6a6", type: "#ffffff", playBlue: "#00a0ff", playGreen: "#00d95f", playRed: "#ff3a44", playYellow: "#ffc400" } as const;
