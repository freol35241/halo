# HALO — Development Rules

## Project Overview

HALO (Hosted Agentic Loop Orchestration) is a mobile-first mission control app for agentic development sessions. Built with SvelteKit, SQLite, Dockerode, and Tailscale.

See `design-vision.md` for full specification.

## Tech Stack

- **Runtime:** Node.js 20
- **Framework:** SvelteKit 2 with TypeScript (strict mode)
- **Database:** SQLite via better-sqlite3, migrations in `src/lib/server/db/migrations/`
- **Container management:** Dockerode via Docker socket
- **Terminal:** xterm.js (frontend) + node-pty (backend)
- **Styling:** Vanilla CSS with design tokens in `src/lib/styles/tokens.css`
- **Testing:** Vitest (unit/integration), Playwright (E2E)
- **Linting:** ESLint + Prettier

## Development Methodology: Red/Green TDD

Every feature follows strict Red/Green/Refactor:

1. **RED** — Write a failing test first. The test must fail for the right reason (not a syntax error).
2. **GREEN** — Write the minimum code to make the test pass. No more.
3. **REFACTOR** — Clean up while keeping tests green.

### Test file conventions

- Unit tests: `src/lib/**/*.test.ts` (colocated with source)
- API route tests: `src/routes/**/*.test.ts`
- E2E tests: `e2e/**/*.test.ts`
- Test files mirror source structure exactly.

### What to test

- **Always test:** Public API of every module, API route handlers, state transitions, error paths.
- **Never test:** Private implementation details, third-party library internals, CSS.

## Code Standards

### TypeScript

- Strict mode, no `any` unless interfacing with untyped externals (and then wrap it).
- Prefer `interface` for object shapes, `type` for unions/intersections.
- All function parameters and return types must be explicitly typed.
- Use `unknown` over `any` for values of uncertain type.

### File organization

```
src/
  lib/
    server/           # Server-only code (DB, Docker, PTY)
      db/             # Database layer
        migrations/   # SQL migration files
      docker/         # Dockerode wrapper
      sessions/       # Session management
    components/       # Svelte components
    stores/           # Svelte stores
    types/            # Shared TypeScript types
    styles/           # CSS design tokens and shared styles
  routes/
    api/              # REST API endpoints
    (app)/            # SvelteKit page routes
```

### Naming

- Files: `kebab-case.ts`, `PascalCase.svelte`
- Functions/variables: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Database tables: `snake_case`
- API routes: `kebab-case`

### Error handling

- Use typed error results (`{ success: true, data } | { success: false, error }`) for domain operations.
- Throw only for truly exceptional/programmer errors.
- API routes return proper HTTP status codes with JSON error bodies.

### Dependencies

- Minimize external dependencies. Prefer standard library and built-in SvelteKit features.
- Every new dependency must be justified. No "utility belt" packages.

## Git Conventions

- Commit messages: `type: short description` (feat, fix, refactor, test, docs, chore)
- One logical change per commit.
- All tests must pass before committing.

## Build & Run

```bash
npm install          # Install dependencies
npm run dev          # Dev server on :5173
npm run test         # Run Vitest
npm run test:e2e     # Run Playwright
npm run check        # Svelte + TypeScript checking
npm run lint         # ESLint + Prettier check
npm run build        # Production build
```
