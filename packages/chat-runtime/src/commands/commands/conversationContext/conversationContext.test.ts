import { expect, test } from "bun:test";
import {
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { conversationContext, conversationMemory } from "./conversationContext";

function temporary(run: (dir: string) => void) {
	const dir = mkdtempSync(join(tmpdir(), "conversation-context-"));
	try {
		run(dir);
	} finally {
		rmSync(dir, { recursive: true });
	}
}

test("archives the complete long history while including recent messages", () =>
	temporary((dir) => {
		const messages = [
			{ role: "user", text: "old ".repeat(22000) },
			{ role: "assistant", text: "recent answer" },
		];
		const result = conversationContext(messages, dir, "session-test");
		const archive = join(dir, "session-test.json");
		expect(JSON.parse(readFileSync(archive, "utf8"))).toEqual(messages);
		expect(statSync(archive).mode & 0o777).toBe(0o600);
		expect(result).toContain(archive);
		expect(result).toContain("recent answer");
		expect(result).not.toContain("old ".repeat(22000));
	}));

test("an oversized final message cannot empty the recent context", () =>
	temporary((dir) => {
		const result = conversationContext(
			[
				{ role: "user", text: "Medida confirmada: 215mm" },
				{ role: "assistant", text: `${"x".repeat(100000)}ÚLTIMA DECISÃO` },
			],
			dir,
			"oversized",
		);
		expect(result).toContain("ÚLTIMA DECISÃO");
		expect(result).toContain("Medida confirmada: 215mm");
		expect(result.length).toBeLessThan(75000);
	}));

test("memory reloads edits and never overwrites established decisions", () =>
	temporary((dir) => {
		conversationMemory(dir, "one");
		const path = join(dir, readdirSync(dir).at(0) ?? "missing-memory");
		writeFileSync(path, "## Decisões confirmadas\nPeça única, 215mm.");
		expect(conversationMemory(dir, "one")).toContain("Peça única, 215mm.");
		expect(readFileSync(path, "utf8")).toContain("Peça única, 215mm.");
		expect(statSync(path).mode & 0o777).toBe(0o600);
		expect(conversationMemory(dir, "two")).not.toContain("Peça única, 215mm.");
		expect(readdirSync(dir)).toHaveLength(2);
	}));

test("oversized memory is bounded and requests the complete file", () =>
	temporary((dir) => {
		conversationMemory(dir, "one");
		writeFileSync(
			join(dir, readdirSync(dir).at(0) ?? "missing-memory"),
			"x".repeat(100000),
		);
		const result = conversationMemory(dir, "one");
		expect(result).toContain("leia o arquivo completo");
		expect(result.length).toBeLessThan(27000);
	}));
