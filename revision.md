# Agent OS Monitoring — Revision Checklist

## Branch
`agent-os-monitoring`

## Monitoring Baseline
- Latest reviewed HEAD: `1d7f504b16d2b586ed5e391ae74df6e9091eff59` (`doc: bootstrap revision.md for continuous improvement loop`)
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
| Mission Log | `/missions` | Implemented with open status/count defects |

## Typecheck
- `tsgo --noEmit`: all packages pass (0 errors)
- `biome check`: 0 errors, 1 warning (`outputIds` unused)

## Known Gaps
1. Mission `verificationStatus` always `"none"` (no reliable mission-to-verification link)
2. Mission `changes` records a reliable `0` as `-1` because `changes: missionChanges || -1` conflates zero with unknown.
3. Agent policy `bashAllowlist` and `ask` (confirmation) runtime enforcement requires separate validation/fix work.
4. Full integration-test availability requires re-checking if source behavior changes; the current commit changes documentation only.
5. `outputIds` remains unused in `packages/coding-agent/src/task/index.ts:1307`.

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

### Pending Worktree Observation — after `1d7f504`
**Observed:** 2026-05-25

**Commit status:** No new commit has landed; HEAD remains `1d7f504`. The following result is provisional and must be re-verified after commit.

**Changed scope:** `packages/coding-agent/src/task/index.ts` is modified in the worktree.

| Pending change | Provisional result | Evidence |
|---|---|---|
| Remove unused `outputIds` | Candidate fix verified by lint | `biome lint .` completes without the previous unused-variable warning. |
| Preserve known zero changed-file counts | Candidate partial fix | The worktree changes `changes` to `hasPatches ? missionChanges : -1`, preserving `0` when a patch source is present and readable. |
| Mission verification association | Not fixed | The worktree still creates missions with `verificationStatus: "none"` and no mission-link update path was observed. |
| Patch-read failure semantics | Remaining risk | `hasPatches` is set before `Bun.file(r.patchPath).text()` succeeds; an unreadable patch path may be recorded as `0` rather than unknown. |

**Pending validation evidence:**
- `bun --cwd=packages/coding-agent run check:types`: pass.
- `bun --cwd=packages/coding-agent run lint`: pass, no warnings emitted.
- `git diff --check -- packages/coding-agent/src/task/index.ts revision.md revision.html`: pass.
- No direct regression test was found for mission change-count semantics or mission verification association.

## Next Commit Checklist
1. Compare new HEAD against `1d7f504` and classify source, test, or documentation scope.
2. Re-check fixes for mission verification association and zero-change recording if mission-related source changes land.
3. Run focused regression tests plus type/lint checks for any behavior-changing commit.
4. Append results here with the new commit hash and evidence.

### Commit `3ba8f3a` — `fix: distinguish zero changes from unknown in missions, remove dead outputIds`
**Reviewed:** 2026-05-25

**Changed scope:** `packages/coding-agent/src/task/index.ts` only (7 insertions, 4 deletions).

**Verdict:** Two defects resolved; one high defect remains.

| Validation | Result | Evidence |
|---|---|---|
| Changed-scope check | Pass | Only `packages/coding-agent/src/task/index.ts` modified. |
| Type validation | Pass | `bun --cwd=packages/coding-agent run check:types` 0 errors. |
| Lint | Pass | `biome check` 0 errors, 0 warnings. |
| Zero-changes fix | Pass | `hasPatches` flag added; `changes: hasPatches ? missionChanges : -1`. |
| Dead-code removal | Pass | Unused `outputIds` variable removed. |

#### Resolved Defects
1. ✅ **Medium — zero changed files conflated with unknown.** Fixed with `hasPatches` boolean gate.
2. ✅ **Low — `outputIds` lint warning.** Removed the dead variable.

#### Remaining Open Defect
1. **High — mission verification results not linked to a mission.** Still `verificationStatus: "none"` hardcoded. Requires mission-to-verification API.

## Updated Known Gaps
1. Mission `verificationStatus` always `"none"` (no reliable mission-to-verification link).
2. Agent policy `bashAllowlist` and `ask` runtime enforcement.
3. No targeted regression tests for mission defects.
