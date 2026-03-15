# Task 003 — Shared Types & API Utilities

**Status:** `[ ]`
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

- [ ] All domain types defined and exported
- [ ] Types match the FeedEntry interface from design-vision.md section 7.2
- [ ] API utility functions tested (response shapes, status codes, error messages)
- [ ] Validation functions tested (valid inputs, invalid inputs, edge cases)
- [ ] `generateId()` produces unique, URL-safe IDs
- [ ] All types importable from `$lib/types`

## Review Feedback

_(populated by the review agent)_
