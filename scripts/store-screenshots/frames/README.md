# Device frames

Three kinds of phone appear in the store images.

**The island handset** is drawn in `templates.mjs` for every App Store image: rounded corners, a pill shaped camera island, graphite band, keys on both sides, no maker's marks.

**The Android handset** is drawn in `templates.mjs` for every Google Play image: flatter corners, a punch hole camera, keys on the right. Each store sees its own kind of phone; App Store Review Guideline 2.3.10 keeps other platforms' imagery out of App Store metadata.

**Apple's official bezels** replace the island handset on the App Store images that allow it (shots marked `appleFrame`, laid out upright and whole) when they are here. Apple publishes them for exactly this purpose at <https://developer.apple.com/design/resources/> under Product Bezels, licensed by the App Store Marketing Artwork License in <https://developer.apple.com/app-store/marketing/guidelines/>. That licence applies only to apps available on the App Store and only while the company is a member of the Apple Developer Program, so use them once Vallo's enrolment is complete. The island handset is our own plain drawing, not Apple's artwork, and Apple's bezel, when it is used, is used exactly as supplied.

## Adding a bezel

1. Download the newest iPhone bezel set from the page above (for example `Bezel-iPhone-17.dmg`) on a Mac and open it.
2. Pick the portrait PNG of the Pro Max model in a dark finish. It has a transparent screen.
3. Measure it and copy it here in one step:

   ```
   node scripts/store-screenshots/frames/measure-bezel.mjs ~/Downloads/<the png> apple-dynamic-island
   ```

   Use the name `apple-standard` for a bezel meant for the images outside the hero set.
4. Run `node scripts/store-screenshots/compose.mjs --device iphone-6.9` and `--device iphone-6.5`. The last line of its output says which bezels it found.

## What the guidelines require of an Apple bezel, and how the compositor keeps to it

| Apple's rule | What `templates.mjs` does |
|---|---|
| Use the image as supplied: no tilting, cropping, reflections or shadows cast from the screen | Only a shot marked `appleFrame` with the `hero` layout takes the bezel, and that layout stands the phone upright and whole |
| Nothing on top of the device | Glass objects are placed only on tilted and photo card layouts, which never take the bezel |
| The screen shows the app as it runs, with a full status bar | The screen is the live capture with the status bar the native shell draws, full signal, Wi-Fi and battery |
| Show the latest devices the app supports | Take the newest Pro Max bezel from the download page |
