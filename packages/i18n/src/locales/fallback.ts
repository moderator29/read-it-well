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

export function withFallback(translation: Translation): Dictionary {
  return merge(en, translation) as Dictionary;
}
