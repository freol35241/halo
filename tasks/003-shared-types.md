# Task 003 — Shared Types & API Utilities

**Status:** `[R]`
**Phase:** Foundation

## Objective

Define TypeScript types for all domain entities and create API response/error handling utilities. TDD.

## Requirements

1. Create type files:
   - `src/lib/types/container.ts` — Container, ContainerStatus, ContainerConfig
   - `src/lib/types/session.ts` — Session, SessionType, SessionStatus
   - `src/lib/types/feed.ts` — FeedEntry, FeedRole, FeedMetadata
   - `src/lib/types/template.ts` — Template, DevcontainerConfig
   - `src/lib/types/index.ts` — re-exports all types

2. Create API utilities at `src/lib/server/api-utils.ts`:
   - `jsonResponse(data, status?)` — creates a JSON Response
   - `errorResponse(message, status)` — creates an error JSON Response
   - `parseRequestBody<T>(request)` — parses and validates request body
   - `generateId()` — generates a unique ID (nanoid or crypto.randomUUID)

3. Create validation utilities at `src/lib/server/validation.ts`:
   - `validateContainerName(name)` — alphanumeric + hyphens, 3-63 chars
   - `validateSessionType(type)` — must be 'claude' | 'terminal' | 'shell'
   - `validateRequired(value, fieldName)` — non-empty string check
   - Returns typed result objects, never throws

## Acceptance Criteria

- [x] All domain types defined and exported
- [x] Types match the FeedEntry interface from design-vision.md section 7.2
- [x] API utility functions tested (response shapes, status codes, error messages)
- [x] Validation functions tested (valid inputs, invalid inputs, edge cases)
- [x] `generateId()` produces unique, URL-safe IDs
- [x] All types importable from `$lib/types`

## Review Feedback

_(populated by the review agent)_

## Build Summary

Implemented all domain type files and server utilities following strict Red/Green TDD:

- `src/lib/types/container.ts` — `Container`, `ContainerStatus`, `ContainerConfig`
- `src/lib/types/session.ts` — `Session`, `SessionType`, `SessionStatus`
- `src/lib/types/feed.ts` — `FeedEntry`, `FeedRole`, `FeedMetadata` (matches design-vision.md §7.2)
- `src/lib/types/template.ts` — `Template`, `DevcontainerConfig`
- `src/lib/types/index.ts` — re-exports all types
- `src/lib/server/api-utils.ts` — `jsonResponse`, `errorResponse`, `parseRequestBody`, `generateId` (uses `crypto.randomUUID`)
- `src/lib/server/validation.ts` — `validateContainerName`, `validateSessionType`, `validateRequired` (typed result objects, never throws)

Tests: 59 passing. `npm run check`, `npm run lint`, and `npm run build` all pass.
