# AGENTS

This file defines coding preferences for this workspace.

## Repository Structure Note

This repository currently contains two app contexts:

- Main app in `src/`: the Soundscape Maker UI used to analyze audio and create exports.
- Package template app in `package/`: a React template copied into exported ZIP packages.

When making changes, keep responsibilities separated:

- Product/runtime features belong to `src/`.
- Exported app template assets and behavior belong to `package/`.
- If packaging behavior changes, update both exporter utilities and matching template expectations.

### Package Development and Sharing Rules

- In `package/` development mode, importing shared code from the parent app is allowed via `@main` (alias to `../src` in `package/vite.config.js`).
- Do not rely on parent-folder imports for exported ZIP runtime; exported packages must run standalone.
- If `package/src/*` uses a shared component from `@main`, ensure the packaging pipeline copies that component and required dependencies into exported package sources (through `src/utils/packageTemplate.ts` or equivalent exporter mapping).
- After introducing a shared component, validate both contexts:
  1. `cd package && npm run dev` (template development works)
  2. Export ZIP and run the unzipped package app (standalone package works)

## Component Rules

- Always create new UI components as TypeScript React files: `.tsx`.
- Use Tailwind CSS utility classes for styling.
- Do not add new component-level CSS files unless explicitly requested.
- Keep components small and composable.

## Types and Interfaces

- Define and export each component props interface in the same `.tsx` file as the component.
- Use the pattern `export interface ComponentNameProps {}`.
- Keep the interface near the top of the file (before the component function).

Example:

```tsx
export interface ButtonProps {
  label: string
  onClick?: () => void
}

export function Button({ label, onClick }: ButtonProps) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='inline-flex items-center rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700'
    >
      {label}
    </button>
  )
}
```

## Implementation Preferences

- Use explicit prop interfaces instead of `any`.
- Use `type` imports where possible.
- Keep file names and symbol names consistent.
- Follow existing project linting and formatting rules.

## Migration Guidance

When touching existing components that do not follow this pattern:

- Move props interfaces into the same component `.tsx` file and export them.
- Keep behavior unchanged while refactoring.
- Remove now-unneeded props type imports from separate files.
