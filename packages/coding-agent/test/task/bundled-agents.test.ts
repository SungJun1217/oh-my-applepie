import { describe, expect, test } from "bun:test";
import { Effort } from "@oh-my-applepie/pi-ai";
import { getBundledAgent } from "@oh-my-applepie/pi-coding-agent/task/agents";

describe("bundled task agents", () => {
	test("exposes scope_guardian as a caution-oriented task-slot agent", () => {
		const agent = getBundledAgent("scope_guardian");

		expect(agent).toBeDefined();
		expect(agent?.source).toBe("bundled");
		expect(agent?.model).toEqual(["pi/task"]);
		expect(agent?.thinkingLevel).toBe(Effort.Medium);
		expect(agent?.description).toContain("unclear requirements");
		expect(agent?.description).toContain("plans that may overreach");
		expect(agent?.tools).toEqual(["read", "search", "find", "yield"]);
		expect(agent?.systemPrompt).toContain("do not implement the change");
		expect(agent?.systemPrompt).toContain("every changed line should trace directly to the user request");
	});
});
