/**
 * AgentProcessTable - /agents process table (ps/top for subagents).
 *
 * Reads from the global AgentRegistry and renders a live table of
 * running and recently-completed subagent processes.
 *
 * Layout:
 * - Header: column labels (ID, Agent, Status, Model, Tool, Cost, Time)
 * - Body: one row per tracked agent, sorted by ID
 * - Footer: summary line (N agents, total cost)
 *
 * Controls:
 * - Esc / q: close table
 * - r: refresh (re-read registry)
 * - j/k or Down/Up: scroll
 */

import {
	type Component,
	Container,
	getKeybindings,
	matchesKey,
	replaceTabs,
	Spacer,
	Text,
	truncateToWidth,
} from "@oh-my-applepie/pi-tui";
import { theme } from "../../modes/theme/theme";
import { type AgentRef, AgentRegistry } from "../../registry/agent-registry";
import { formatDuration } from "../../tools/render-utils";
import { DynamicBorder } from "./dynamic-border";

/** Maximum number of agents visible before scrolling. */
const MAX_VISIBLE = 20;

/** Column widths for the process table. */
const COLS = {
	id: 10,
	agent: 12,
	status: 10,
	model: 20,
	tool: 14,
	cost: 9,
	time: 8,
} as const;

function getStatusColor(status: string): string {
	switch (status) {
		case "running":
			return theme.fg("success", status);
		case "completed":
			return theme.fg("dim", status);
		case "failed":
			return theme.fg("error", status);
		case "aborted":
			return theme.fg("warning", status);
		default:
			return theme.fg("muted", status);
	}
}
/** Single-char source indicators for router decision modelSource. */
function sourceLabel(source: string): string {
	switch (source) {
		case "override":
			return "o";
		case "frontmatter":
			return "f";
		case "role-alias":
			return "r";
		case "parent-active":
			return "p";
		case "fallback":
			return "b";
		default:
			return "d";
	}
}

function formatCost(cost: number): string {
	if (cost === 0) return "-";
	if (cost < 0.01) return "<$0.01";
	return `$${cost.toFixed(3)}`;
}

function formatTime(ms: number): string {
	if (ms === 0) return "-";
	return formatDuration(ms);
}

function truncateCol(text: string, width: number): string {
	return truncateToWidth(replaceTabs(text), width);
}

/** Sort agents: running first, then by ID. */
function sortAgents(agents: AgentRef[]): AgentRef[] {
	return [...agents].sort((a, b) => {
		const aRunning = a.status === "running" ? 0 : 1;
		const bRunning = b.status === "running" ? 0 : 1;
		if (aRunning !== bRunning) return aRunning - bRunning;
		return a.id.localeCompare(b.id);
	});
}

export class AgentProcessTable extends Container {
	#scrollOffset = 0;

	onClose?: () => void;
	onRequestRender?: () => void;

	close(): void {
		this.onClose?.();
	}

	#getAgents(): AgentRef[] {
		return AgentRegistry.global()
			.list()
			.filter(ref => ref.progress !== undefined);
	}

	render(width: number): string[] {
		const agents = sortAgents(this.#getAgents());
		this.#clampScroll(agents.length);
		const lines: string[] = [];

		// Header
		const header = theme.bold(
			truncateCol("ID", COLS.id).padEnd(COLS.id) +
				truncateCol("Agent", COLS.agent).padEnd(COLS.agent) +
				truncateCol("Status", COLS.status).padEnd(COLS.status) +
				truncateCol("Model", COLS.model).padEnd(COLS.model) +
				truncateCol("Tool", COLS.tool).padEnd(COLS.tool) +
				truncateCol("Cost", COLS.cost).padEnd(COLS.cost) +
				truncateCol("Time", COLS.time).padEnd(COLS.time),
		);
		lines.push(header);
		lines.push(theme.fg("dim", "─".repeat(Math.min(width, 90))));

		if (agents.length === 0) {
			lines.push("");
			lines.push(theme.fg("muted", "  No agent processes. Subagents spawned via the task tool will appear here."));
			return lines;
		}

		// Body
		const end = Math.min(this.#scrollOffset + MAX_VISIBLE, agents.length);
		for (let i = this.#scrollOffset; i < end; i++) {
			const ref = agents[i];
			const p = ref.progress;
			if (!p) continue;

			const modelStr = ref.modelOverride
				? typeof ref.modelOverride === "string"
					? ref.modelOverride
					: ref.modelOverride.join(",")
				: "-";
			const currentTool = p.currentTool ?? "-";
			const costStr = formatCost(p.cost);
			const timeStr = formatTime(p.durationMs);
			// Router decision: prefix model with source indicator
			const rd = ref.routerDecision;
			const modelDisplay = rd
				? `${sourceLabel(rd.modelSource)}${truncateCol(rd.resolvedModel, COLS.model - 2)}`
				: modelStr;

			const row =
				truncateCol(ref.id, COLS.id).padEnd(COLS.id) +
				truncateCol(p.agent, COLS.agent).padEnd(COLS.agent) +
				getStatusColor(ref.status).padEnd(COLS.status + (ref.status.length - Bun.stringWidth(ref.status))) +
				truncateCol(modelDisplay, COLS.model).padEnd(COLS.model) +
				truncateCol(currentTool, COLS.tool).padEnd(COLS.tool) +
				truncateCol(costStr, COLS.cost).padEnd(COLS.cost) +
				truncateCol(timeStr, COLS.time).padEnd(COLS.time);

			lines.push(row);
		}

		// Footer
		if (agents.length > MAX_VISIBLE) {
			lines.push(theme.fg("muted", `  (${this.#scrollOffset + 1}-${end} of ${agents.length})`));
		}
		const totalCost = agents.reduce((sum, ref) => sum + (ref.progress?.cost ?? 0), 0);
		lines.push("");
		lines.push(
			theme.fg(
				"dim",
				`${agents.length} agents · total cost ${formatCost(totalCost)} · Esc/q to close · r to refresh`,
			),
		);

		return lines;
	}

	handleInput(keyData: string): void {
		const kb = getKeybindings();
		if (kb.matches(keyData, "tui.select.cancel") || matchesKey(keyData, "q")) {
			this.close();
			return;
		}
		if (matchesKey(keyData, "r")) {
			this.onRequestRender?.();
			return;
		}
		if (kb.matches(keyData, "tui.select.up") || matchesKey(keyData, "k")) {
			this.#scrollBy(-1);
			return;
		}
		if (kb.matches(keyData, "tui.select.down") || matchesKey(keyData, "j")) {
			this.#scrollBy(1);
			return;
		}
		if (kb.matches(keyData, "tui.select.pageUp")) {
			this.#scrollBy(-MAX_VISIBLE);
			return;
		}
		if (kb.matches(keyData, "tui.select.pageDown")) {
			this.#scrollBy(MAX_VISIBLE);
		}
	}

	#scrollBy(delta: number): void {
		const agents = this.#getAgents();
		this.#scrollOffset += delta;
		this.#clampScroll(agents.length);
		this.onRequestRender?.();
	}

	#clampScroll(agentCount: number): void {
		const maxOffset = Math.max(0, agentCount - MAX_VISIBLE);
		this.#scrollOffset = Math.min(Math.max(0, this.#scrollOffset), maxOffset);
	}

	invalidate(): void {
		super.invalidate();
	}
}

/**
 * Create the full overlay component wrapping AgentProcessTable
 * with borders, title, and keyboard handling.
 */
export function createAgentProcessTableOverlay(
	onClose: () => void,
	onRequestRender: () => void,
): { component: Container; focus: Component } {
	const table = new AgentProcessTable();
	const unsubscribe = AgentRegistry.global().onChange(() => onRequestRender());
	table.onClose = () => {
		unsubscribe();
		onClose();
	};
	table.onRequestRender = onRequestRender;

	const root = new Container();
	root.addChild(new DynamicBorder());
	root.addChild(new Spacer(1));
	root.addChild(new Text(theme.bold(theme.fg("accent", " AGENTS ")), 1, 0));
	root.addChild(new Spacer(1));
	root.addChild(new DynamicBorder());
	root.addChild(new Spacer(1));
	root.addChild(table);
	root.addChild(new Spacer(1));
	root.addChild(new DynamicBorder());

	return { component: root, focus: table };
}
