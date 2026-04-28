# Soundscape Package Template

This folder contains placeholder files used by Soundscape Maker export.

## How it works

- Files in this folder are copied into the exported ZIP package.
- The exporter can replace template tokens in selected files.
- Keep this folder under version control and edit it to customize future exports.

## Available template tokens

- `__SOUNDSCAPE_AUDIO__`: Relative path to the exported audio file.
- `__SOUNDSCAPE_DATA__`: Relative path to `soundscape.json`.
- `__SOUNDSCAPE_METADATA__`: Relative path to `metadata.json`.

These tokens are currently replaced in:

- `src/App.jsx`

## Running the exported package

After unzipping the exported archive:

1. `npm install`
2. `npm run dev`
