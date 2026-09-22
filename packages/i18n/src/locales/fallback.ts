import { en, type Dictionary } from "./en";

/**
 * A translation may be incomplete; a build may not break because of it.
 *
 * Every dictionary used to be typed as the whole `Dictionary`, so the moment
 * a worker added a namespace to English and had not yet reached the other
 * three files, the production build failed on a type error in a translation
 * file (Vercel, 18 September 2026, `catalogue` missing in `ha`). A missing
 * translation is a copy gap to be closed by a speaker; it is not a reason for
 * nobody to be able to deploy. So a locale now declares the keys it has, typed
 * as a deep partial of the English shape (a wrong key or a wrong type is still
 * a compile error), and `withFallback` fills whatever it lacks from English at
 * module load. English stays the reference; the other three can only ever be
 * as complete as English, never more.
 */
export type Translation = DeepPartial<Dictionary>;

export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K];
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function merge(base: unknown, over: unknown): unknown {
  if (over === undefined) return base;
  if (isPlainObject(base) && isPlainObject(over)) {
    const out: Record<string, unknown> = { ...base };
    for (const key of Object.keys(over)) {
      out[key] = merge(base[key], over[key]);
    }
    return out;
  }
  return over;
}

/**
 * WHAT THE LOCALE ITSELF SUPPLIED, AS OPPOSED TO WHAT ENGLISH FILLED IN.
 *
 * A locale module exports `withFallback({...})`, so by the time anything can
 * import it the English fill has already happened and the two are
 * indistinguishable. That made the completeness gate measure the wrong thing:
 * it counted every key whose rendered text equals English, which includes
 * every key the locale has simply not reached yet. So ADDING ONE ENGLISH KEY
 * TO `en.ts` raised the count for all three locales at once, tripped the gate,
 * and the only way past was to hand-raise the ceiling. A gate whose ceiling
 * must be raised on every ordinary commit teaches people to raise ceilings,
 * which is precisely the habit it was built to prevent.
 *
 * The defect it actually exists to catch is narrower and quite different:
 * ENGLISH SMUGGLED INTO A TRANSLATION FILE, where `yo.ts` declares a key and
 * gives it the English string, which raises that locale's apparent coverage
 * while the screen still reads in English.
 *
 * Those two are only separable before the merge, so the merge records what it
 * was given. The keys are held in a WeakMap against the dictionary object, so
 * nothing about the exported shape changes and no locale file is touched.
 */
const supplied = new WeakMap<object, ReadonlySet<string>>();

function paths(value: unknown, prefix = "", into = new Set<string>()): Set<string> {
  if (!isPlainObject(value)) return into;
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof child === "string") into.add(path);
    else if (isPlainObject(child)) paths(child, path, into);
  }
  return into;
}

export function withFallback(translation: Translation): Dictionary {
  const merged = merge(en, translation) as Dictionary;
  supplied.set(merged, paths(translation));
  return merged;
}

/**
 * The dotted key paths this locale declared for itself. Empty for English,
 * which declares everything and fills from nothing, and empty for any object
 * that did not come through `withFallback`.
 */
export function suppliedKeys(dictionary: object): ReadonlySet<string> {
  return supplied.get(dictionary) ?? new Set<string>();
}
