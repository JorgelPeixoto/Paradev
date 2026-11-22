import { expect, test } from "bun:test";
import { randomUUID } from "node:crypto";
import {
	emptySnapshot,
	reduceMany,
	userMessageText,
} from "@superset/chat/core";
import type { UserMessage } from "@superset/chat/protocol";
import { FakeHarness } from "../../harness/fake";
import { agentMessage, turn } from "../../testing/fixtures";
import { createTestRuntime } from "../../testing/testRuntime";
import { journalEnvelopes, waitFor } from "../../testing/testUtils";

test("changing harness twice preserves earlier messages without displaying the bootstrap", async () => {
	const sent: unknown[] = [];
	let count = 0;
	class RecordingHarness extends FakeHarness {
		override prompt(content: Parameters<FakeHarness["prompt"]>[0]) {
			sent.push(content);
			return super.prompt(content);
		}
	}
	const factory = () => {
		const id = `t${++count}`;
		return new RecordingHarness({
			turns: [
				[
					{ kind: "turn", turn: turn(id) },
					{
						kind: "item",
						item: agentMessage(`a${count}`, `reply ${count}`),
						turnId: id,
					},
					{
						kind: "turn",
						turn: turn(id, { status: "completed", completedAtMs: 2 }),
					},
					{ kind: "session", session: { status: "idle" } },
				],
			],
		});
	};
	const runtime = createTestRuntime({
		harnesses: new Map([
			["claude", factory],
			["codex", factory],
		]),
	});
	try {
		const first = runtime.commands.createSession({
			commandId: randomUUID(),
			scopeId: "one",
			cwd: "/tmp",
			harness: "claude",
		});
		const text = "Keep this beginning. ".repeat(2500);
		runtime.commands.prompt({
			commandId: randomUUID(),
			sessionId: first.sessionId,
			clientId: "start",
			content: [{ type: "text", text }],
		});
		await waitFor(
			() => runtime.sessions.get(first.sessionId)?.status === "idle",
		);
		await runtime.commands.closeSession({ sessionId: first.sessionId });
		const second = runtime.commands.createSession({
			commandId: randomUUID(),
			scopeId: "one",
			cwd: "/tmp",
			harness: "codex",
			continuation: { sessionId: first.sessionId },
		});
		await waitFor(
			() => runtime.sessions.get(second.sessionId)?.status === "idle",
		);
		await runtime.commands.closeSession({ sessionId: second.sessionId });
		const third = runtime.commands.createSession({
			commandId: randomUUID(),
			scopeId: "one",
			cwd: "/tmp",
			harness: "claude",
			continuation: { sessionId: second.sessionId },
		});
		await waitFor(
			() => runtime.sessions.get(third.sessionId)?.status === "idle",
		);
		const snapshot = reduceMany(
			emptySnapshot(),
			journalEnvelopes(runtime, third.sessionId),
		);
		const messages = [...snapshot.items.values()].map(({ item }) => item);
		expect(
			messages
				.filter((item) => item.kind === "agent_message")
				.map((item) => item.id),
		).toEqual(["a1", "a2", "a3"]);
		expect(
			messages
				.filter((item) => item.kind === "user_message")
				.map((item) => userMessageText(item as UserMessage))
				.filter(Boolean),
		).toEqual([text]);
		expect(JSON.stringify(sent[2])).toContain("Keep this beginning.");
		expect(JSON.stringify(sent[2]).length).toBeGreaterThan(text.length);
		await runtime.commands.closeSession({ sessionId: third.sessionId });
		const resumed = runtime.commands.createSession({
			commandId: randomUUID(), scopeId: "one", cwd: "/tmp", harness: "claude",
			resume: { harnessSessionId: "native-session", replacesSessionId: third.sessionId },
		});
		await waitFor(() => runtime.sessions.get(resumed.sessionId)?.status === "idle");
		const restored = reduceMany(emptySnapshot(), journalEnvelopes(runtime, resumed.sessionId));
		expect(restored.items.has("a1")).toBe(true);
		expect(restored.items.has("a2")).toBe(true);
		expect(restored.items.has("a3")).toBe(true);
	} finally {
		await runtime.dispose();
	}
});

test("a continuation cannot read another workspace", async () => {
	const runtime = createTestRuntime({
		harnesses: new Map([["fake", () => new FakeHarness({ turns: [] })]]),
	});
	try {
		const source = runtime.commands.createSession({
			commandId: randomUUID(),
			scopeId: "private",
			cwd: "/tmp",
			harness: "fake",
		});
		expect(() =>
			runtime.commands.createSession({
				commandId: randomUUID(),
				scopeId: "other",
				cwd: "/tmp",
				harness: "fake",
				continuation: { sessionId: source.sessionId },
			}),
		).toThrow("outside its workspace");
	} finally {
		await runtime.dispose();
	}
});

test("imported history stays idle and is passed invisibly on the first user prompt", async () => {
	const sent: unknown[] = [];
	class RecordingHarness extends FakeHarness {
		override prompt(content: Parameters<FakeHarness["prompt"]>[0]) {
			sent.push(content);
			return super.prompt(content);
		}
	}
	const runtime = createTestRuntime({
		harnesses: new Map([["fake", () => new RecordingHarness({ turns: [[]] })]]),
	});
	try {
		const created = runtime.commands.createSession({
			commandId: randomUUID(),
			scopeId: "one",
			cwd: "/tmp",
			harness: "fake",
			historyImport: {
				title: "Imported conversation",
				messages: [
					{
						id: "old-user",
						turnId: "old-turn",
						role: "user",
						text: "Remember the lighthouse",
						at: 1,
					},
					{
						id: "old-agent",
						turnId: "old-turn",
						role: "assistant",
						text: "Remembered",
						at: 2,
					},
				],
			},
		});
		expect(sent).toHaveLength(0);
		runtime.commands.prompt({
			commandId: randomUUID(),
			sessionId: created.sessionId,
			clientId: "first",
			content: [{ type: "text", text: "What did I say?" }],
		});
		await waitFor(() => sent.length === 1);
		expect(JSON.stringify(sent[0])).toContain("Remember the lighthouse");
		const snapshot = reduceMany(
			emptySnapshot(),
			journalEnvelopes(runtime, created.sessionId),
		);
		const shown = [...snapshot.items.values()]
			.filter(({ item }) => item.kind === "user_message")
			.map(({ item }) => userMessageText(item as UserMessage))
			.filter(Boolean);
		expect(shown).toEqual(["Remember the lighthouse", "What did I say?"]);
		expect(
			snapshot.items.get(`import-context-${created.sessionId}`)?.item,
		).toMatchObject({ content: [] });
	} finally {
		await runtime.dispose();
	}
});
