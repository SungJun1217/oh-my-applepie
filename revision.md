# Agent OS Monitoring — Revision Checklist

## Branch
`agent-os-monitoring`

## Monitoring Baseline
- Latest reviewed HEAD: `e3ab6b571bb13e271a82d6c804a2123f223b3a98` (`doc: record f22dd10 fix in revision.md`)
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
2. Agent policy `bashAllowlist` and `ask` (confirmation) runtime enforcement requires separate validation/fix work.
3. No direct regression coverage was found for mission verification association or mission change-count edge cases.

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

### Commit `f22dd10` — `fix: set hasPatches only after successful root patch read`
**Reviewed:** 2026-05-25

**Changed scope:** `packages/coding-agent/src/task/index.ts` only (1 insertion, 1 deletion).

**Verdict:** Mission change-count unreadable-patch boundary is corrected in implementation; mission verification linkage remains open.

| Validation | Result | Evidence |
|---|---|---|
| Changed-scope check | Pass | `git diff --name-status 96f9260..f22dd10` reports only `M packages/coding-agent/src/task/index.ts`. |
| Type validation | Pass | `bun --cwd=packages/coding-agent run check:types` completed without errors. |
| Lint | Pass | `bun --cwd=packages/coding-agent run lint` completed without warnings. |
| Existing targeted tests | Pass | 21 tests passed across executor reminder, executor wall-clock, and keybinding escape component tests. |
| Patch-read unknown boundary | Pass by implementation inspection | For `r.patchPath`, `hasPatches = true` now runs only after `Bun.file(r.patchPath).text()` succeeds; unreadable root patch paths no longer force `changes: 0`. |
| Direct regression test for this boundary | Missing | No focused test found that forces an unreadable root patch path and asserts mission `changes === -1`. |

#### Resolved Defect
1. **Medium — unreadable root patch path could be recorded as zero changed files.** `hasPatches` is now set only after successful root patch reading.

#### Remaining Open Defects / Risks
1. **High — mission verification results are not linked to a mission.** `packages/coding-agent/src/task/index.ts:1352` still initializes `verificationStatus: "none"`; `/verify` continues to store a last result without mission association.
2. **Medium — mission fix regression coverage is absent.** The zero/unknown fixes are implementation-inspected and indirectly compile/test-clean, but not locked by direct behavior tests.

### Commit `e3ab6b5` — `doc: record f22dd10 fix in revision.md`
**Reviewed:** 2026-05-25

**Changed scope:** `revision.md` only; functional source remains at `f22dd10`.

**Verdict:** Documentation commit records the code fix, but does not alter the remaining high mission-verification defect or add regression coverage.

| Validation | Result | Evidence |
|---|---|---|
| Changed-scope check | Pass | `git diff --name-status f22dd10..e3ab6b5` reports only `M revision.md`. |
| Source validation retained | Pass | On the functional source at `f22dd10`, typecheck, lint, and 21 existing targeted tests passed during this review cycle. |
| Documentation accuracy | Corrected in worktree | Duplicate/overlapping `f22dd10` entries are consolidated here and the missing regression-test caveat is retained. |

## Updated Known Gaps
1. Mission `verificationStatus` always `"none"` (no reliable mission-to-verification link).
2. Agent policy `bashAllowlist` and `ask` runtime enforcement remains unverified.
3. No targeted regression tests for mission verification association or mission change-count semantics.

## Next Commit Checklist
1. Compare new HEAD against `e3ab6b5` and classify source, test, or documentation scope.
2. Re-check mission verification association and direct mission regression tests if mission-related source changes land.
3. Run focused regression tests plus type/lint checks for any behavior-changing commit.
4. Append results here with the new commit hash and evidence.

### Commit `e627b31` — `feat: link /verify results to latest mission`
**Reviewed:** 2026-05-25

**Changed scope:** `packages/coding-agent/src/mission/store.ts`, `packages/coding-agent/src/verify/index.ts`.

**Verdict:** High defect resolved. `/verify` now updates the latest mission's `verificationStatus` via `updateLatestMissionVerification()`.

| Validation | Result | Evidence |
|---|---|---|
| Changed-scope check | Pass | Two source files modified. |
| Type validation | Pass | `tsgo --noEmit` 0 errors, `biome check` 0 errors. |
| Mission store API | Pass | `updateLatestMissionVerification()` added. |
| Verify wiring | Pass | `runAndStore()` calls `updateLatestMissionVerification()`. |
| Default unchanged | Pass | `recordMission()` still defaults to `"none"`. |

#### Resolved Defect
1. ✅ **High — mission verification results not linked to a mission.**

#### Known Limitation
- `/verify` before mission recording is a no-op (no mission exists yet). Re-run `/verify` after task completion.
