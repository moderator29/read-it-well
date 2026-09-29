/**
 * The passcode layer: the "Welcome back" lock, setup and confirm, the
 * settings screen and the refusals. docs/PASSCODE.md is the design.
 * `{name}`, `{count}` and `{seconds}` are filled by the component.
 */
export const passcodeEn = {
  welcomeBack: "Welcome back, {name}",
  welcomeBackNoName: "Welcome back",
  enterCode: "Enter your passcode",
  lockedTitle: "Vallo is locked",
  wrong: "That is not your passcode.",
  wrongLeft: {
    one: "That is not your passcode. 1 more try before a short pause.",
    other: "That is not your passcode. {count} more tries before a short pause.",
  },
  wrongLastBeforeSignOut: {
    one: "That is not your passcode. 1 more wrong try signs you out.",
    other: "That is not your passcode. {count} more wrong tries sign you out.",
  },
  cooldown: "Too many tries. Wait {seconds} seconds.",
  paced: "Too many tries from here. Wait a little and try again.",
  unavailable: "We could not check your passcode just now. Try it, or use your password.",
  passwordOnly: "Your passcode was entered wrongly too many times. Sign in again to set a new one.",
  signInAgain: "Sign in again",
  error: "That did not go through. Check your connection and try again.",
  usePassword: "Use your password instead",
  signOut: "Sign out",
  checking: "Checking",

  setupTitle: "Create your passcode",
  setupBody: "You will use it to open Vallo and before money moves. It is not your password.",
  resetTitle: "Set a new passcode",
  resetBody: "You signed in again, so you can choose a new passcode now.",
  confirmTitle: "Enter it again",
  confirmBody: "Type the same {count} digits to confirm.",
  currentTitle: "Enter your current passcode",
  currentBody: "Then choose the new one.",
  useFour: "Use a 4-digit passcode",
  useSix: "Use a 6-digit passcode",
  trivial: "That one is too easy to guess. Avoid repeats, runs like 1234 and your birth year.",
  mismatch: "Those did not match. Start again.",
  proofRequired: "For your safety, sign in again before changing your passcode.",
  saved: "Passcode saved.",
  /** The success sheet's title after a code is set. */
  setDone: "Passcode set",
  changed: "Passcode changed.",

  settingsRow: "Passcode",
  settingsRowSub: "The code that unlocks Vallo on this device",
  screenTitle: "Passcode",
  lengthLabel: "Passcode length",
  lengthSix: "6 digits",
  lengthFour: "4 digits",
  change: "Change passcode",
  forgot: "Forgot your passcode? Sign in with your password to set a new one.",
  notSet: "You have not set a passcode yet.",
  lockNote: "Vallo locks after 5 minutes away, and in every new tab.",

  keypadLabel: "Passcode keypad",
  deleteKey: "Delete",
  digitsEntered: "{count} of {total} digits entered",
  moneyLocked: "Unlock Vallo with your passcode first. Nothing was charged or changed.",
};
