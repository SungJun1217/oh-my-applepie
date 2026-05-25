/**
 * VerificationRunner — executes project checks and produces structured results.
 *
 * Powers the /verify slash command. Checks run via Bun shell and results are
 * parsed from exit codes + stdout/stderr.
 */

import { $ } from "bun";
import { updateLatestMissionVerification } from "../mission/store";
import { theme } from "../modes/theme/theme";

export interface VerificationCheck {
	name: string;
	command: string;
	required: boolean;
}

export interface VerificationCheckResult {
	name: string;
	passed: boolean;
	exitCode: number;
	stdout: string;
	stderr: string;
	durationMs: number;
}

export interface VerificationResult {
	checks: VerificationCheckResult[];
	allPassed: boolean;
	totalDurationMs: number;
}

const DEFAULT_CHECKS: VerificationCheck[] = [{ name: "typecheck + lint", command: "bun check", required: true }];

/** Run verification checks and return structured results. */
export async function runVerification(
	checks: VerificationCheck[] = DEFAULT_CHECKS,
	cwd?: string,
): Promise<VerificationResult> {
	const start = Date.now();
	const results: VerificationCheckResult[] = [];

	for (const check of checks) {
		const checkStart = Date.now();
		let passed = false;
		let exitCode = -1;
		let stdout = "";
		let stderr = "";

		try {
			const result = await $`${{ raw: check.command }}`
				.cwd(cwd ?? process.cwd())
				.nothrow()
				.quiet();
			exitCode = result.exitCode;
			stdout = result.stdout?.toString("utf-8") ?? "";
			stderr = result.stderr?.toString("utf-8") ?? "";
			passed = exitCode === 0;
		} catch (err) {
			stderr = String(err);
		}

		results.push({
			name: check.name,
			passed,
			exitCode,
			stdout: stdout.slice(-4000), // keep last 4KB
			stderr: stderr.slice(-4000),
			durationMs: Date.now() - checkStart,
		});
	}

	return {
		checks: results,
		allPassed: results.every(r => r.passed || !checks.find(c => c.name === r.name)?.required),
		totalDurationMs: Date.now() - start,
	};
}

/** Format verification result as TUI-displayable text. */
export function formatVerificationResult(result: VerificationResult): string {
	const lines: string[] = [];

	for (const check of result.checks) {
		const icon = check.passed ? theme.fg("success", "✓") : theme.fg("error", "✗");
		const timeStr = `${check.durationMs}ms`;
		lines.push(`  ${icon} ${check.name} (${timeStr})`);

		if (!check.passed && check.stderr) {
			const errLines = check.stderr.split("\n").slice(0, 10);
			for (const errLine of errLines) {
				lines.push(`    ${theme.fg("dim", errLine)}`);
			}
			if (check.stderr.split("\n").length > 10) {
				lines.push(`    ${theme.fg("dim", `... and ${check.stderr.split("\n").length - 10} more lines`)}`);
			}
		}
	}

	lines.push("");
	const overall = result.allPassed
		? theme.fg("success", "All checks passed")
		: theme.fg("error", "Some checks failed");
	lines.push(`${overall} · ${result.totalDurationMs}ms total`);

	return lines.join("\n");
}

let lastResult: VerificationResult | null = null;

export function getLastResult(): VerificationResult | null {
	return lastResult;
}
export function resetLastResult(): void {
	lastResult = null;
}

export async function runAndStore(checks?: VerificationCheck[], cwd?: string): Promise<VerificationResult> {
	lastResult = await runVerification(checks, cwd);
	updateLatestMissionVerification(lastResult.allPassed ? "passed" : "failed");
	return lastResult;
}
