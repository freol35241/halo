# Task 004 — Docker Service

**Status:** `[X]`

## Summary

Create Dockerode wrapper service for container lifecycle management. Since we can't test with a real Docker daemon in CI, use a test double pattern: define a DockerService interface and provide both a real (Dockerode) and fake (in-memory) implementation. TDD against the interface.

## Acceptance Criteria

- [x] `src/lib/server/docker/docker-service.ts` — interface with create, start, stop, remove, list, inspect methods
- [x] `src/lib/server/docker/dockerode-service.ts` — real implementation using Dockerode
- [x] `src/lib/server/docker/fake-docker-service.ts` — in-memory fake for testing
- [x] All interface methods tested via the fake implementation
- [x] Container creation applies template config (image, env, ports, mounts)
- [x] Containers are attached to `halo-net` network
- [x] No ports are published to host (network-only access)

## Review Result

**APPROVED**

Clean implementation of the test-double pattern. Interface is well-defined, fake enforces correct invariants, and the Dockerode implementation correctly sets `NetworkMode: 'halo-net'` without publishing ports. 17 tests cover all methods including error paths (not-found, duplicate name, remove-running-without-force). All checks pass.

## Build Summary

Implemented the Docker service layer using the test-double pattern:

- **`docker-service.ts`**: Defines the `DockerService` interface with `create`, `start`, `stop`, `remove`, `list`, and `inspect` methods, plus `CreateContainerOptions`, `RemoveContainerOptions`, and `DockerContainerInfo` types.

- **`fake-docker-service.ts`**: In-memory implementation using `Map<id, info>`. Enforces all invariants (duplicate name check, not-found errors, can't remove running container without `force`). Used for all unit tests.

- **`dockerode-service.ts`**: Real implementation wrapping the Dockerode library. Sets `NetworkMode: 'halo-net'` so containers join the shared network. Never sets `PortBindings` — ports are only accessible within `halo-net`, not published to the host.

All 76 tests pass. `npm run check`, `npm run lint`, and `npm run build` all pass.
