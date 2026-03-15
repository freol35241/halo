# Task 001 — Project Scaffolding

**Status:** `[ ]`
**Phase:** Foundation

## Objective

Initialize a SvelteKit 2 project with TypeScript strict mode, Vitest, Playwright, ESLint, and Prettier. Create the directory structure defined in CLAUDE.md. Add CSS design tokens matching the palette from design-vision.md.

## Requirements

1. Initialize SvelteKit 2 with the following options:
   - TypeScript (strict mode in tsconfig.json)
   - SvelteKit adapter-node (for production deployment)

2. Install and configure dev dependencies:
   - Vitest (with @testing-library/svelte if needed)
   - Playwright
   - ESLint (with svelte and typescript plugins)
   - Prettier (with svelte plugin)

3. Create directory structure:
   ```
   src/
     lib/
       server/
         db/
           migrations/
         docker/
         sessions/
       components/
       stores/
       types/
       styles/
         tokens.css
     routes/
       api/
       (app)/
   e2e/
   ```

4. Create `src/lib/styles/tokens.css` with design tokens:
   - All colors from the palette in design-vision.md (bg, sidebar, surface, text, accent, status colors, etc.)
   - Font families: DM Sans (sans), JetBrains Mono (mono)
   - Responsive breakpoints as custom properties

5. Create placeholder tests:
   - `src/lib/placeholder.test.ts` — a simple passing Vitest test
   - `e2e/app.test.ts` — a Playwright test that loads the home page

6. Verify all commands work:
   - `npm run dev` starts the dev server
   - `npm run test` runs Vitest and passes
   - `npm run check` runs svelte-check and passes
   - `npm run lint` runs ESLint/Prettier and passes
   - `npm run build` produces a production build

## Acceptance Criteria

- [ ] SvelteKit 2 app boots on `:5173`
- [ ] TypeScript strict mode enabled
- [ ] Vitest configured with a passing placeholder test
- [ ] Playwright configured with a passing placeholder E2E test
- [ ] ESLint + Prettier configured and passing
- [ ] Directory structure matches CLAUDE.md spec
- [ ] Design tokens in `src/lib/styles/tokens.css` match palette from design-vision.md
- [ ] `npm run build` produces a working production build
- [ ] All scripts in package.json work: dev, build, test, check, lint

## Review Feedback

_(populated by the review agent)_
