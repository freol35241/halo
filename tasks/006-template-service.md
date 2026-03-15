# Task 006 — template-service

**Status:** `[R]`

## Requirements

- `src/lib/server/templates/` — template definitions matching design-vision.md section 6.1
- `GET /api/templates` — returns all available templates
- Each template includes full devcontainer.json config
- Templates are validated at startup
- All template shapes tested

## Review Feedback

_(populated by the review agent)_

## Build Summary

Implemented built-in devcontainer template service and REST API following Red/Green TDD:

**Template Service (`src/lib/server/templates/index.ts`):**
- Four built-in templates: Rust Systems, SvelteKit Web, Python ML, Blank
- Each template conforms to `Template` type with id, name, description, tags, devcontainerConfig
- `getTemplateById(id)` — lookup helper
- `validateTemplate(template)` — validates required fields, returns typed result
- Templates are validated at module load time (startup validation)

**API Route (`src/routes/api/templates/+server.ts`):**
- `GET /api/templates` — returns all four built-in templates as JSON
- Follows same testable handler pattern as container routes

**Tests:**
- `src/lib/server/templates/templates.test.ts` — 11 tests covering all template shapes, getTemplateById, and validateTemplate
- `src/routes/api/templates/templates.test.ts` — 4 integration tests for the API route
- All 132 tests pass, lint clean, type check clean, build successful
