# AGENTS

This file defines coding preferences for this workspace.

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
