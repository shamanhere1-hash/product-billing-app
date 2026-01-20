# Contributing Guide (Agent Focused)

This codebase is designed to be friendly to both human developers and AI coding agents. Please follow these guidelines when making changes.

## 🤖 For AI Agents

### Code Style & Patterns
- **Functional Components:** Always use functional components with Hooks.
- **TypeScript:** Use strict typing. Avoid `any` whenever possible. Define interfaces for props and data structures.
- **Imports:** Use absolute imports `@/` for strictly local files.
  - `@/components/...`
  - `@/lib/...`
  - `@/hooks/...`
- **Explicitness:** Be explicit in variable naming.

### Adding New Features
1. **Plan first:** Analyze the current structure. If adding a new page, verify if it needs a new entry in `App.tsx` routes.
2. **Components:** Check `src/components` first. Reuse generic UI components from `src/components/ui` (Shadcn).
3. **Data Fetching:** Do NOT plain `fetch` in components. Create a hook using `useQuery` or `useMutation` (TanStack Query).

### Modifying UI
- Use **Tailwind CSS** utility classes. Avoid inline styles.
- Look for existing variants in Shadcn components before creating custom CSS.

### Testing
- Ensure no compilation errors by running a build check if possible.
- If writing tests, place them in `src/test` or alongside components if the pattern changes.

## 🛠 Common Tasks

### Creating a new Page
1. Create a file in `src/pages/PageName.tsx`.
2. Export it as default.
3. Add a route in `src/App.tsx`.

### Adding a Shadcn Component
Check if it already exists in `src/components/ui`. If not, you may need to ask the user to install it via CLI, or manually implement it following Shadcn patterns.

## 🚫 Anti-Patterns
- ❌ Direct DOM manipulation.
- ❌ Large monolithic components (break them down).
- ❌ Hardcoded strings (use constants or config if repeated).
