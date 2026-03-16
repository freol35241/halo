# Task 014 — new-session-modal

**Status:** `[X]`

## Summary

Build the new session bottom sheet modal. Container selection (running only), session type selection, name input. Wired to session API. Launching a session navigates to the feed view.

## Acceptance Criteria

- Bottom sheet modal (`NewSessionModal.svelte`)
- Container dropdown showing only running containers (loaded from `GET /api/containers`)
- Session type selection: Claude, Terminal, Lisa Loop (maps to `claude`, `terminal`, `shell`)
- Name input with validation (required)
- "Launch" button calls `POST /api/sessions` and navigates to `/sessions/<id>`
- "New Session" button in Sidebar opens the modal
- E2E test: new session modal opens, form is filled, submit is attempted

## Build Summary

- Created `src/lib/components/new-session-modal-utils.ts` with `validateSessionName`, `SESSION_TYPE_LABELS`, and `sessionTypeFromLabel` helpers
- Created `src/lib/components/new-session-modal-utils.test.ts` with 14 unit tests (TDD: RED→GREEN)
- Created `src/lib/components/NewSessionModal.svelte` — bottom sheet modal with:
  - Container dropdown (only `running` containers, loaded from `GET /api/containers`)
  - Session type selection (Claude/Terminal/Lisa Loop mapped to `claude`/`terminal`/`shell`)
  - Name input with validation
  - "Launch" button calls `POST /api/sessions` and navigates to `/sessions/<id>`
- Updated `src/lib/components/Sidebar.svelte` to open `NewSessionModal` when "New Session" is clicked
- Created `e2e/new-session-modal.test.ts` with 7 E2E tests covering modal open/close, type selection, and create flow
- All 276 unit tests pass, lint clean, no type errors, build successful

## Review Result

**APPROVED**

All 276 unit tests pass, no type errors, no lint errors, build succeeds. Implementation is clean and well-structured: utils extracted for testability, proper validation, accessible markup with ARIA attributes, correct API integration with error handling. E2E tests cover modal lifecycle and form interactions comprehensively.
