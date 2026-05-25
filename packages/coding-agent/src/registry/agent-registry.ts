/**
 * AgentRegistry - Process-global registry of live AgentSession instances.
 *
 * Tracks every alive agent (the main session plus every subagent) so the
 * `irc` tool can address peers by id. Sessions are registered explicitly at
 * creation and removed when the owner releases them.
 */

import type { AgentSession } from "../session/agent-session";

export const MAIN_AGENT_ID = "0-Main";

export type AgentStatus = "running" | "idle" | "completed" | "failed" | "aborted";
export type AgentKind = "main" | "sub";

export interface AgentRef {
	id: string;
	displayName: string;
	kind: AgentKind;
	parentId?: string;
	status: AgentStatus;
	session: AgentSession | null;
	sessionFile: string | null;
	createdAt: number;
	lastActivity: number;
	/** Execution progress data, populated during subagent execution. */
	progress?: AgentRefProgress;
	/** Model override used when the agent was spawned. */
	modelOverride?: string | string[];
	/** Router decision log — why this model was chosen for this agent. */
	routerDecision?: RouterDecision;
	/** Workspace metadata for isolated task execution. */
	workspace?: WorkspaceInfo;
	/** Active tool policy for this agent (e.g. "allow:read,search" or "default"). */
	toolPolicy?: string;
	/** Consecutive same-error count for budget escalation. */
	sameErrorCount?: number;
}

/** Workspace info for the /workspaces table. */
export interface WorkspaceInfo {
	/** Absolute path to the merged worktree directory. */
	path: string;
	/** Isolation backend (apfs, rcopy, etc.) or "main" for non-isolated. */
	backend: string;
	/** Number of files changed (approximate, from git diff --stat). */
	changes: number;
	/** Verification status for this workspace. */
	verified: "pending" | "passed" | "failed" | "none";
}

/** How the model was chosen for a subagent spawn. */
export interface RouterDecision {
	/** Agent type that was requested (e.g. "designer", "task"). */
	requestedAgent: string;
	/** Where the agent definition came from. */
	agentSource: "bundled" | "project" | "user";
	/** How the model pattern was resolved. */
	modelSource: "override" | "frontmatter" | "role-alias" | "parent-active" | "fallback" | "default";
	/** The final resolved model string (provider/id). */
	resolvedModel: string;
	/** Human-readable trace of the decision chain. */
	reason: string;
}

/** Progress snapshot for the /agents process table. */
export interface AgentRefProgress {
	agent: string;
	agentSource: string;
	task: string;
	currentTool?: string;
	recentTools: Array<{ tool: string; args: string }>;
	toolCount: number;
	tokens: number;
	contextTokens?: number;
	contextWindow?: number;
	cost: number;
	durationMs: number;
}

export type RegistryEvent =
	| { type: "registered"; ref: AgentRef }
	| { type: "status_changed"; ref: AgentRef }
	| { type: "progress_updated"; ref: AgentRef }
	| { type: "model_updated"; ref: AgentRef }
	| { type: "removed"; ref: AgentRef };

type RegistryListener = (event: RegistryEvent) => void;

export interface RegisterInput {
	id: string;
	displayName: string;
	kind: AgentKind;
	parentId?: string;
	session: AgentSession | null;
	sessionFile?: string | null;
	status?: AgentStatus;
}

export class AgentRegistry {
	static #global: AgentRegistry | undefined;

	static global(): AgentRegistry {
		if (!AgentRegistry.#global) {
			AgentRegistry.#global = new AgentRegistry();
		}
		return AgentRegistry.#global;
	}

	/** Reset the global registry. Test-only. */
	static resetGlobalForTests(): void {
		AgentRegistry.#global = new AgentRegistry();
	}

	readonly #refs = new Map<string, AgentRef>();
	readonly #listeners = new Set<RegistryListener>();

	/** Keep at most this many terminal (completed/failed/aborted) refs. */
	static readonly MAX_TERMINAL_REFS = 30;

	register(input: RegisterInput): AgentRef {
		const existing = this.#refs.get(input.id);
		const now = Date.now();
		const ref: AgentRef = {
			id: input.id,
			displayName: input.displayName,
			kind: input.kind,
			parentId: input.parentId,
			status: input.status ?? "running",
			session: input.session,
			sessionFile: input.sessionFile ?? null,
			createdAt: existing?.createdAt ?? now,
			lastActivity: now,
			// Preserve metadata from previous registration.
			progress: existing?.progress,
			modelOverride: existing?.modelOverride,
			routerDecision: existing?.routerDecision,
			workspace: existing?.workspace,
			toolPolicy: existing?.toolPolicy,
			sameErrorCount: existing?.sameErrorCount,
		};
		this.#refs.set(ref.id, ref);
		this.#emit({ type: "registered", ref });
		this.#pruneTerminal();
		return ref;
	}

	#pruneTerminal(): void {
		const terminal = [...this.#refs.values()]
			.filter(ref => ref.status !== "running" && ref.status !== "idle")
			.sort((a, b) => b.lastActivity - a.lastActivity);
		while (terminal.length > AgentRegistry.MAX_TERMINAL_REFS) {
			const oldest = terminal.pop()!;
			this.#refs.delete(oldest.id);
		}
	}

	setStatus(id: string, status: AgentStatus): void {
		const ref = this.#refs.get(id);
		if (!ref || ref.status === status) return;
		ref.status = status;
		ref.lastActivity = Date.now();
		this.#emit({ type: "status_changed", ref });
		if (status !== "running" && status !== "idle") {
			this.#pruneTerminal();
		}
	}

	attachSession(id: string, session: AgentSession, sessionFile?: string | null): void {
		const ref = this.#refs.get(id);
		if (!ref) return;
		ref.session = session;
		if (sessionFile !== undefined) ref.sessionFile = sessionFile;
		ref.lastActivity = Date.now();
	}

	detachSession(id: string): void {
		const ref = this.#refs.get(id);
		if (!ref) return;
		ref.session = null;
	}

	unregister(id: string): void {
		const ref = this.#refs.get(id);
		if (!ref) return;
		this.#refs.delete(id);
		this.#emit({ type: "removed", ref });
	}

	get(id: string): AgentRef | undefined {
		return this.#refs.get(id);
	}

	list(): AgentRef[] {
		return [...this.#refs.values()];
	}

	/**
	 * Returns every alive agent (running | idle) except the caller.
	 * Flat namespace: every agent can see every other agent.
	 */
	listVisibleTo(id: string): AgentRef[] {
		return this.list().filter(ref => ref.id !== id && (ref.status === "running" || ref.status === "idle"));
	}

	onChange(listener: RegistryListener): () => void {
		this.#listeners.add(listener);
		return () => this.#listeners.delete(listener);
	}

	/** Update execution progress for a registered agent. */
	updateProgress(id: string, progress: AgentRefProgress): void {
		const ref = this.#refs.get(id);
		if (!ref) return;
		ref.progress = progress;
		ref.lastActivity = Date.now();
		this.#emit({ type: "progress_updated", ref });
	}

	/** Update model override info for a registered agent. */
	updateModel(id: string, modelOverride: string | string[] | undefined): void {
		const ref = this.#refs.get(id);
		if (!ref) return;
		ref.modelOverride = modelOverride;
		ref.lastActivity = Date.now();
		this.#emit({ type: "model_updated", ref });
	}

	#emit(event: RegistryEvent): void {
		for (const listener of this.#listeners) {
			try {
				listener(event);
			} catch {
				// listeners must not break the dispatch loop
			}
		}
	}
}
