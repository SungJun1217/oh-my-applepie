/**
 * WorkspacesTable — /workspaces view showing isolated worktree status.
 *
 * Reads from AgentRegistry and renders a table of workspaces with
 * their backend, change count, and verification status.
 */

import {
	type Component,
	Container,
	getKeybindings,
	replaceTabs,
	Spacer,
	Text,
	truncateToWidth,
} from "@oh-my-applepie/pi-tui";
import { theme } from "../../modes/theme/theme";
import { type AgentRef, AgentRegistry } from "../../registry/agent-registry";
import { DynamicBorder } from "./dynamic-border";

const MAX_VISIBLE = 20;

const COLS = {
	workspace: 26,
	agent: 12,
	backend: 8,
	status: 10,
	changes: 8,
	verified: 10,
} as const;

function verifiedColor(status: string): string {
	switch (status) {
		case "passed":
			return theme.fg("success", "passed");
		case "failed":
			return theme.fg("error", "failed");
		case "pending":
			return theme.fg("warning", "pending");
		default:
			return theme.fg("dim", "-");
	}
}

function truncateCol(text: string, width: number): string {
	return truncateToWidth(replaceTabs(text), width);
}

export class WorkspacesTable extends Container {
	#scrollOffset = 0;

	onClose?: () => void;
	onRequestRender?: () => void;

	close(): void {
		this.onClose?.();
	}

	#getWorkspaces(): AgentRef[] {
		return AgentRegistry.global()
			.list()
			.filter(ref => ref.workspace !== undefined)
			.sort((a, b) => a.id.localeCompare(b.id));
	}

	render(width: number): string[] {
		const workspaces = this.#getWorkspaces();
		this.#clampScroll(workspaces.length);
		const lines: string[] = [];

		const header = theme.bold(
			truncateCol("Workspace", COLS.workspace).padEnd(COLS.workspace) +
				truncateCol("Agent", COLS.agent).padEnd(COLS.agent) +
				truncateCol("Backend", COLS.backend).padEnd(COLS.backend) +
				truncateCol("Status", COLS.status).padEnd(COLS.status) +
				truncateCol("Changes", COLS.changes).padEnd(COLS.changes) +
				truncateCol("Verified", COLS.verified).padEnd(COLS.verified),
		);
		lines.push(header);
		lines.push(theme.fg("dim", "─".repeat(Math.min(width, 82))));

		if (workspaces.length === 0) {
			lines.push("");
			lines.push(theme.fg("muted", "  No workspaces. Isolated task execution creates workspaces."));
			return lines;
		}

		const end = Math.min(this.#scrollOffset + MAX_VISIBLE, workspaces.length);
		for (let i = this.#scrollOffset; i < end; i++) {
			const ref = workspaces[i];
			const ws = ref.workspace;
			const wsPath = ws ? ws.path : `omp/task/${ref.id}`;
			const wsBackend = ws?.backend ?? "main";
			const wsStatus = ref.status;
			const changes = ws?.changes ?? 0;
			const verified = ws?.verified ?? "none";
			const agentName = ref.progress?.agent ?? ref.displayName;

			const statusColor =
				wsStatus === "completed"
					? theme.fg("dim", wsStatus)
					: wsStatus === "running"
						? theme.fg("success", wsStatus)
						: wsStatus === "failed" || wsStatus === "aborted"
							? theme.fg("error", wsStatus)
							: theme.fg("muted", wsStatus);

			const row =
				truncateCol(wsPath, COLS.workspace).padEnd(COLS.workspace) +
				truncateCol(agentName, COLS.agent).padEnd(COLS.agent) +
				truncateCol(wsBackend, COLS.backend).padEnd(COLS.backend) +
				statusColor.padEnd(COLS.status + (wsStatus.length - Bun.stringWidth(wsStatus))) +
				truncateCol(String(changes), COLS.changes).padEnd(COLS.changes) +
				verifiedColor(verified).padEnd(COLS.verified + (verified.length - Bun.stringWidth(verified)));

			lines.push(row);
		}

		if (workspaces.length > MAX_VISIBLE) {
			lines.push(theme.fg("muted", `  (${this.#scrollOffset + 1}-${end} of ${workspaces.length})`));
		}
		lines.push("");
		lines.push(theme.fg("dim", `${workspaces.length} workspaces · Esc/q to close`));

		return lines;
	}

	handleInput(keyData: string): void {
		const kb = getKeybindings();
		if (kb.matches(keyData, "tui.select.cancel") || keyData === "q") {
			this.close();
			return;
		}
		if (kb.matches(keyData, "tui.select.up") || keyData === "k") {
			this.#scrollBy(-1);
			return;
		}
		if (kb.matches(keyData, "tui.select.down") || keyData === "j") {
			this.#scrollBy(1);
		}
	}

	#scrollBy(delta: number): void {
		this.#scrollOffset += delta;
		this.#clampScroll(this.#getWorkspaces().length);
		this.onRequestRender?.();
	}

	#clampScroll(count: number): void {
		this.#scrollOffset = Math.min(Math.max(0, this.#scrollOffset), Math.max(0, count - MAX_VISIBLE));
	}

	invalidate(): void {
		super.invalidate();
	}
}

export function createWorkspacesTableOverlay(
	onClose: () => void,
	onRequestRender: () => void,
): { component: Container; focus: Component } {
	const table = new WorkspacesTable();
	const unsubscribe = AgentRegistry.global().onChange(() => onRequestRender());
	table.onClose = () => {
		unsubscribe();
		onClose();
	};
	table.onRequestRender = onRequestRender;
	const root = new Container();
	root.addChild(new DynamicBorder());
	root.addChild(new Spacer(1));
	root.addChild(new Text(theme.bold(theme.fg("accent", " WORKSPACES ")), 1, 0));
	root.addChild(new Spacer(1));
	root.addChild(new DynamicBorder());
	root.addChild(new Spacer(1));
	root.addChild(table);
	root.addChild(new Spacer(1));
	root.addChild(new DynamicBorder());

	return { component: root, focus: table };
}
