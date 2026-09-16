# @vallo/design-tokens

`src/tokens.css`. That is the package.

Consumed by one line in `apps/web/src/app/globals.css`:

```css
@import "@vallo/design-tokens/tokens.css";
```

## There used to be a TypeScript mirror and it is gone

`src/index.ts` was 192 lines exporting six objects: `token`, `duration` and
`easing` as `var(--nf-*)` strings, and `palette`, `iconRamp` and
`iridescentRamp` as literal hex. It was the package's `main` and `types`.

**Nothing imported it.** Not one file in the repository, ever. The only thing
that reached this package was the CSS import above.

Its own docstring gave the reason it existed: "Needed because SVG
`<stop stop-color>` does not resolve `color-mix()` and some browsers
historically mishandled `var()` inside gradient stops." The first half is true
and the second is not, and the tree proves it: there are exactly two inline SVG
gradients in the product, and `components/agent/charts/AreaSparkline.tsx` writes

```tsx
<stop offset="0%" stopColor="var(--nf-mode-agent)" stopOpacity="0.34" />
```

which resolves, follows the theme, and needed no mirror. The other,
`components/app/wallet/BalanceCard.tsx`, uses `currentColor`. Both solved the
problem the mirror was built for, without it, years after it was built.

The `var()`-string half was worse than unused. `token.contentPrimary` was the
string `"var(--nf-content-primary)"`: a second name for a token, offering
nothing over typing `var(--nf-content-primary)` at the call site, and one more
thing to keep in step. TypeScript cannot check a string against a CSS file, so
nothing ever did.

And the hex half had already drifted. Its own comments record it: eight inks and
five mists were left holding pre-rebrand purple-tinted greys, and three state
colours were a full step brighter than the values the product paints, so
"anything drawing an SVG from this file was quietly painting the old brand". A
hand-maintained copy of layer 1, with no consumer, that has already been wrong
once, is not an asset.

## If a JS mirror is ever needed again

The one case CSS genuinely cannot reach is `color-mix()` inside an SVG
`stop-color`, and a `<canvas>` that has to paint a brand colour. Neither exists
in the product today. When one does, add back only what that case needs, give it
the consumer in the same change, and have `scripts/check-css-tokens.mjs` guard
it: that script already fails the build on a `var(--nf-*)` in this package that
resolves to nothing, which is the check the old mirror never had.

## One loose end

`typescript` is still listed in `devDependencies` and there is now no
TypeScript in the package. Removing it needs an `npm install` to rewrite
`package-lock.json`, which is not a thing to do to a lock file while other
workstreams are writing to the tree. It is harmless where it is; take it out
with the next dependency change.
