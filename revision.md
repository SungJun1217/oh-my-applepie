# Agent OS Monitoring — Revision Checklist

## Branch
`agent-os-monitoring`

## Monitoring Baseline
- Latest reviewed HEAD: `96f92600956c9a98f789c8e10390e6da22982e1f` (`doc: record fix verification in revision.md (commit 3ba8f3a)`)
- Functional baseline reviewed: `7c1b6c9317416fd787a4add3bf97b637575b92c6` (`feat: Agent OS monitoring — /agents, /workspaces, /verify, /missions`)
- Review rule: when HEAD changes, append a commit review entry with changed scope, validation evidence, open defects, and regression-test status.

## Implemented Features

| Feature | Command | Status |
|---|---|---|
| Process Table | `/agents`, `/ps` | Implemented |
| Router Decision Log | `/agents` model column | Implemented |
| Verification Loop | `/verify`, `/vet` | Implemented, not associated with missions |
| Workspaces Manager | `/workspaces`, `/ws` | Implemented |
| Agent Policy Engine | `AgentDefinition.policy` | Declared; runtime enforcement still to verify/fix |
| Budget Scheduler | `sameErrorCount` tracking | Implemented |
| Mission Log | `/missions` | Implemented with open status/count-edge defects |

## Typecheck
- `tsgo --noEmit`: all packages pass (0 errors)
- `biome lint .`: 0 errors, 0 warnings on HEAD `96f9260`

## Known Gaps
1. Mission `verificationStatus` always `"none"` (no reliable mission-to-verification link)
2. Mission `changes` now preserves `0` when a patch source is present, but may report `0` instead of unknown if a root patch path exists and reading it fails.
3. Agent policy `bashAllowlist` and `ask` (confirmation) runtime enforcement requires separate validation/fix work.
4. No direct regression coverage was found for mission verification association or mission change-count edge cases.

## Verification Results
<!-- Other agents: append verification findings below this line -->

### Commit `1d7f504` — `doc: bootstrap revision.md for continuous improvement loop`
**Reviewed:** 2026-05-25

**Changed scope:** `revision.md` only; no changes under `packages/coding-agent/src` or `packages/coding-agent/test` since functional baseline `7c1b6c9`.

**Verdict:** Needs revision in implementation; this documentation commit does not fix the known mission defects.

| Validation | Result | Evidence |
|---|---|---|
| Changed-scope check | Pass | `git diff --name-status 7c1b6c9..1d7f504` reports only `A revision.md`. |
| Source/test change check | Pass | No diff in `packages/coding-agent/src` or `packages/coding-agent/test` since `7c1b6c9`. |
| Type validation on functional baseline | Pass | `bun --cwd=packages/coding-agent run check:types` completed without error before this doc-only commit. |
| Targeted tests on functional baseline | Pass | 21 tests passed across executor reminder, executor wall-clock, and keybinding escape component tests. |
| Registry preservation/terminal-retention smoke | Pass | Duplicate registration retained live metadata; terminal registry retention capped at 30 entries. |
| Lint | Warning remains | `packages/coding-agent/src/task/index.ts:1307` declares unused `outputIds`. |

#### Confirmed Open Defects
1. **High — mission verification results are not linked to a mission.**

   `packages/coding-agent/src/task/index.ts:1350` creates each mission with `verificationStatus: "none"`, while `/verify` stores only a global last result and no mission update API exists.
2. **Medium — zero changed files is stored as unknown.**

   `packages/coding-agent/src/task/index.ts:1351` uses `changes: missionChanges || -1`; a valid `missionChanges === 0` becomes `-1`.
3. **Low — lint warning remains.**

   `packages/coding-agent/src/task/index.ts:1307` contains unused `outputIds`.
4. **Medium — direct regression tests for the defects are missing.**

   No targeted mission-status association or zero-change-count regression coverage was found in the verified test scope.

#### Verified Resolved from Functional Baseline `7c1b6c9`
- Duplicate agent registration preserves live metadata (`workspace`, `toolPolicy`, and router/model information).
- Terminal agent references are retained with a bounded limit of 30.
- Mission patch inspection runs before temporary patch cleanup.
- Mission workspace collection no longer falls back to patch-file paths.

#### Working Tree Note
- `revision.html` is already deleted in the working tree (`D revision.html`) and was not part of commit `1d7f504` or this functional defect verification.

### Commit `3ba8f3a` — `fix: distinguish zero changes from unknown in missions, remove dead outputIds`
**Reviewed:** 2026-05-25

**Changed scope:** `packages/coding-agent/src/task/index.ts` only (4 insertions, 2 deletions).

**Verdict:** One defect resolved, one defect partially mitigated, and one high defect remains.

| Validation | Result | Evidence |
|---|---|---|
| Changed-scope check | Pass | Only `packages/coding-agent/src/task/index.ts` modified. |
| Type validation | Pass | `bun --cwd=packages/coding-agent run check:types` 0 errors. |
| Lint | Pass | `biome check` 0 errors, 0 warnings. |
| Known zero-changes handling | Partial pass | `hasPatches` preserves zero for available patch sources, but is set before root patch reads succeed. |
| Dead-code removal | Pass | Unused `outputIds` variable removed. |

#### Resolved Defect
1. **Low — `outputIds` lint warning.** Removed the dead variable; lint now emits no warnings.

#### Remaining / Partially Mitigated Defects
1. **High — mission verification results not linked to a mission.** Still `verificationStatus: "none"` hardcoded. Requires mission-to-verification API.
2. **Medium — mission change-count unknown/zero boundary is incomplete.** The new `hasPatches` flag correctly retains zero when patch data is available, but it is set before `Bun.file(r.patchPath).text()` succeeds; an unreadable patch may be recorded as zero rather than unknown.

### Commit `96f9260` — `doc: record fix verification in revision.md (commit 3ba8f3a)`
**Reviewed:** 2026-05-25

**Changed scope:** `revision.md` only; source state remains commit `3ba8f3a`.

**Verdict:** Documentation updated but required correction: `3ba8f3a` removes the lint warning and improves zero tracking, but does not fully resolve unreadable-patch semantics or mission verification linkage.

| Validation | Result | Evidence |
|---|---|---|
| Source/type validation on HEAD | Pass | `bun --cwd=packages/coding-agent run check:types` completed without errors. |
| Source lint on HEAD | Pass | `bun --cwd=packages/coding-agent run lint` completed without warnings. |
| Existing targeted tests | Pass | 21 tests passed across executor reminder, executor wall-clock, and keybinding escape component tests. |
| Direct mission regression coverage | Missing | No direct test covering mission status association or patch-read count semantics found in the verified scope. |

## Updated Known Gaps
1. Mission `verificationStatus` always `"none"` (no reliable mission-to-verification link).
2. Mission change-count handling needs an explicit unreadable-patch/unknown rule and regression tests.
3. Agent policy `bashAllowlist` and `ask` runtime enforcement remains unverified.
4. No targeted regression tests for mission defects.

## Next Commit Checklist
1. Compare new HEAD against `96f9260` and classify source, test, or documentation scope.
2. Re-check mission verification association and patch-read/unknown handling if mission-related source changes land.
3. Run focused regression tests plus type/lint checks for any behavior-changing commit.
4. Append results here with the new commit hash and evidence.

### Commit `f22dd10` — `fix: set hasPatches only after successful root patch read`
**Reviewed:** 2026-05-25

**Changed scope:** `packages/coding-agent/src/task/index.ts` only (1 insertion, 1 deletion).

**Verdict:** Partial-pass defect now fully resolved.

| Validation | Result | Evidence |
|---|---|---|
| Changed-scope check | Pass | Only `packages/coding-agent/src/task/index.ts` modified. |
| Type validation | Pass | `bun --cwd=packages/coding-agent run check:types` 0 errors. |
| Lint | Pass | `biome check` 0 errors, 0 warnings. |
| Unreadable-patch handling | Pass | `hasPatches = true` moved inside try after successful `Bun.file().text()`. |

#### Resolved Defect
1. ✅ **Medium — unreadable root patch produced false zero.** Fixed by gating `hasPatches` on successful file read.

#### Remaining Open Defect
1. **High — mission verification results not linked to a mission.** Still `verificationStatus: "none"`.
