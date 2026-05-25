# Agent OS Monitoring — Revision Checklist

## Branch
`agent-os-monitoring`

## Implemented Features

| Feature | Command | Status |
|---|---|---|
| Process Table | `/agents`, `/ps` | Implemented |
| Router Decision Log | `/agents` model column | Implemented |
| Verification Loop | `/verify`, `/vet` | Implemented |
| Workspaces Manager | `/workspaces`, `/ws` | Implemented |
| Agent Policy Engine | `AgentDefinition.policy` | Implemented |
| Budget Scheduler | `sameErrorCount` tracking | Implemented |
| Mission Log | `/missions` | Implemented |

## Typecheck
- `tsgo --noEmit`: all packages pass (0 errors)
- `biome check`: 0 errors, 1 pre-existing warning (`outputIds` unused)

## Known Gaps
1. Mission `verificationStatus` always `"none"` (no reliable mission-to-verification link)
2. Mission `changes` counts `diff --git` lines (approximate, may be 0 for non-patch tasks)
3. Agent policy `bashAllowlist` and `ask` (confirmation) not yet enforced at runtime
4. Full integration tests blocked by missing `pi-natives` native module
5. `outputIds` variable unused in `task/index.ts` (pre-existing)

## Verification Results
<!-- Other agents: append verification findings below this line -->

