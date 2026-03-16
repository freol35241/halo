# Task 009 — New Container Modal

**Status:** `[R]`

## Summary

Build the two-step bottom sheet modal for creating containers. Step 1: template selection. Step 2: configuration (name, repo, CLAUDE.md, extensions, post-create command). Wired to API.

## Acceptance Criteria

- [x] Bottom sheet modal (mobile-native pattern)
- [x] Step 1: template cards with selection state
- [x] Step 2: form fields (name, repo URL, CLAUDE.md source, extensions, post-create command)
- [x] "Create & Launch" button calls `POST /api/containers`
- [x] Validation: container name required, valid format
- [x] Success: navigates to new container config view
- [x] E2E test: create container flow

## Review Feedback

_(populated by the review agent)_

## Build Summary

### What was built

**`src/lib/components/new-container-modal-utils.ts`**
Validation utility with `validateContainerName(name)` function. Accepts lowercase letters, numbers, and hyphens; rejects empty names, uppercase, underscores, spaces, leading/trailing hyphens.

**`src/lib/components/new-container-modal-utils.test.ts`**
11 unit tests covering all validation cases (TDD: tests written first, failing, then implementation added).

**`src/lib/components/NewContainerModal.svelte`**
Two-step bottom sheet modal:
- Step 1: Fetches templates from `GET /api/templates`, displays template cards with selection state, emoji icons per template. "Continue" button advances to step 2.
- Step 2: Form with container name (validated), git repo URL, CLAUDE.md source selector (from-repo / from-template / none), additional VS Code extensions (comma-separated), additional post-create command. "Create & Launch" submits to `POST /api/containers`, then navigates to `/containers/{id}` on success.
- Keyboard support: Escape closes modal.
- Loading/error states for template fetch and form submission.
- "Back" button returns from step 2 to step 1.

**`src/lib/components/Sidebar.svelte`** (updated)
Wired "New Container" button to show `NewContainerModal`.

**`e2e/app.test.ts`** (updated)
Added 5 E2E tests covering the create container flow:
- Modal opens from sidebar button
- Template cards are displayed
- Backdrop click closes modal
- Continue navigates to step 2
- Validation error shown when name is empty
- Back button returns to step 1

### Verification

- `npm run test` — 147 tests pass (18 test files)
- `npm run check` — 0 errors, 1 a11y warning (suppressed with svelte-ignore)
- `npm run lint` — passes (prettier + eslint)
- `npm run build` — production build succeeds
