# Soundscape Maker

A web tool for transforming your own audio (MP3) into a unique, interactive 3D “soundscape.” Users upload their audio directly in the browser, view a real-time preview of a 3D landscape shaped by the sound, and then export everything (audio, data, minimal React viewer) as a ZIP package.

---

## Main Concept

- **Audio → 3D Landscape:**  
  Your uploaded MP3 is analyzed in-browser to generate a **JSON array**. This data drives a 3D grid model, where each point's height is determined by values extracted from the sound.
- **Mapping:**  
  The JSON is an array of arrays, with values normalized between 0 and 1.
  - The **outer array index** represents time slices (Z axis).
  - The **inner array index** represents positions along the X axis for each time slice.
  - The **value** at each (Z, X) point represents the height (Y axis) of the landscape.
- **Example:**
  ```json
  [
    [0.19, 0.18, 0.09, 0.0], // Time slice 0 (Z=0) line composed by the 3D vectors: [0, 0.19, 0], [1, 0.18, 0], [2, 0.09, 0], [3, 0.00, 0]
    [0.18, 0.17, 0.1, 0.0] // Time slice 1 (Z=1) line composed by the 3D vectors: [0, 0.18, 1], [1, 0.17, 1], [2, 0.10, 1], [3, 0.00, 1]
  ]
  ```

The lines form a 3D “wave” surface, connecting dots along X for each Y. Then each point in the line is connected to the corresponding point in the next line (Z+1) to create a continuous landscape that evolves over time as the audio plays.

## User Experience / Flow

#### Upload Audio:

Drag & drop or choose an MP3 file via browser UI.

#### Live Preview

The tool analyzes the audio, generates the landscape, displays an interactive 3D preview. Users can tweak variables to adjust the mapping and shape, then play the audio on top of the resulting soundscape.
Users can make adjustments until satisfied with the soundscape.

#### Export ZIP Package:

Soundscape Maker allows you to download an export package from the **Generate JSON** page using the **Export** button.

The ZIP includes:

- Your uploaded audio file saved as a real file in `audio/`.
- The generated landscape data in `data/soundscape.json`.
- Export metadata in `data/metadata.json`.
- A React app template (copied from the repository `package/` folder) that can load and play the exported assets.

### Package Template Folder (`package/`)

This repository contains a second app template under `package/`. It is used as the source for exported package files.

- Edit files in `package/` to customize what gets shipped in exported ZIPs.
- The exporter performs token replacement where needed (currently in `package/src/App.jsx`) to wire relative paths for audio and JSON files.
- After unzipping an exported package, run `npm install` and `npm run dev` inside the unzipped folder to run the packaged React app.

### Package Development Mode (with local demo assets)

For package UI/theme development, the template app supports local demo assets directly in:

- `package/audio/`
- `package/data/`

Run the template app locally:

1. `cd package`
2. `npm install`
3. `npm run dev`

In development mode, `package/src/App.jsx` reads paths from `.env` (`VITE_SOUNDSCAPE_*`).
During ZIP export, those token fallbacks are replaced by real generated paths, and `.env` is not included in the archive.

### Sharing components from parent `src/`

The template app can import from the main app during development through the `@main` alias (configured in `package/vite.config.js`, pointing to `../src`).

Example import:

```js
import AudioVisualizer from '@main/components/AudioVisualizer'
```

Important: parent-folder imports are for local development. Exported ZIPs are standalone, so any shared component used by the template must also be copied into the exported package source by the packaging layer (`src/utils/packageTemplate.ts`).

Reminder to share a component safely:

1. Import it via `@main/...` while developing in `package/`.
2. Add the component (and its needed dependencies) to exported template files in `src/utils/packageTemplate.ts`.
3. Export a ZIP and run the packaged app to verify the component resolves without parent-folder references.

- current demo package hosts Music by <a href="https://pixabay.com/users/sound_garage-47313534/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=382957">SOUND_GARAGE</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=382957">Pixabay</a>, only for development purposes.

### How to run the website:

1. Run `npm install`
2. Run `npm run dev`
