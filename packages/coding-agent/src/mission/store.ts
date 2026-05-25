/**
 * MissionStore — in-memory mission log for /missions command.
 *
 * Each task tool invocation that spawns agents creates a mission entry.
 * The store holds the last N missions for replay and export.
 */

export interface MissionAgent {
	id: string;
	agent: string;
	status: string;
	model?: string;
	cost: number;
	durationMs: number;
}

export interface Mission {
	id: string;
	startedAt: number;
	endedAt?: number;
	agents: MissionAgent[];
	workspaces: string[];
	verificationStatus: "pending" | "passed" | "failed" | "none";
	/** Summary of changes made (file count, -1 = unknown). */
	changes: number;
	/** Total cost across all agents in USD. */
	totalCost: number;
}

const MAX_MISSIONS = 50;
const missions: Mission[] = [];

export function recordMission(mission: Mission): void {
	missions.unshift(mission);
	if (missions.length > MAX_MISSIONS) {
		missions.length = MAX_MISSIONS;
	}
}

export function getMissions(): readonly Mission[] {
	return missions;
}

export function getLatestMission(): Mission | undefined {
	return missions[0];
}

export function getMission(id: string): Mission | undefined {
	return missions.find(m => m.id === id);
}
/** Format a mission as displayable text. */
export function formatMission(m: Mission): string {
	const lines = [
		`MISSION: ${m.id}`,
		`Agents: ${m.agents.length}`,
		...m.agents.map(a => `  - ${a.id}: ${a.agent} (${a.status}, ${a.model ?? "?"})`),
		`Workspaces: ${m.workspaces.join(", ")}`,
		`Verification: ${m.verificationStatus}`,
		`Total cost: $${m.totalCost.toFixed(3)}`,
	];
	return lines.join("\n");
}
