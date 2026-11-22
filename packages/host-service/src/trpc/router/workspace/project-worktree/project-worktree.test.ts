import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "../../../../db/schema";
import { workspaceRouter } from "../workspace";
import type { HostServiceContext } from "../../../../types";
import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { inspectProjectWorktree } from "./project-worktree";

test("accepts an isolated task worktree and rejects another project, the primary checkout, and production branches", async () => {
	const root = mkdtempSync(join(tmpdir(), "project-link-"));
	const repo = join(root, "repo"),
		other = join(root, "other"),
		task = join(root, "task"),
		production = join(root, "production");
	const env = {
		...process.env,
		GIT_CONFIG_GLOBAL: "/dev/null",
		GIT_CONFIG_NOSYSTEM: "1",
	};
	const git = (cwd: string, args: string[]) =>
		execFileSync("git", ["-C", cwd, ...args], {
			env,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "pipe"],
		});
	try {
		for (const path of [repo, other]) {
			execFileSync("git", ["-c", "init.defaultBranch=trunk", "init", path], {
				env,
				stdio: "pipe",
			});
			git(path, [
				"-c",
				"user.name=Test",
				"-c",
				"user.email=test@example.invalid",
				"-c",
				"commit.gpgsign=false",
				"commit",
				"--allow-empty",
				"-m",
				"initial",
			]);
		}
		git(repo, ["worktree", "add", "-b", "codex/task", task]);
		git(repo, ["worktree", "add", "-b", "main", production]);
		const factory = (path: string) => ({
			raw: async (args: string[]) => git(path, args),
		});
		expect((await inspectProjectWorktree(repo, task, factory)).branch).toBe(
			"codex/task",
		);
		await expect(inspectProjectWorktree(repo, other, factory)).rejects.toThrow(
			"another project",
		);
		await expect(inspectProjectWorktree(repo, repo, factory)).rejects.toThrow(
			"separate worktree",
		);
		await expect(
			inspectProjectWorktree(repo, production, factory),
		).rejects.toThrow("production branch");
		const sqlite = new Database(":memory:");
		const db = drizzle(sqlite, { schema });
		migrate(db, {
			migrationsFolder: resolve(import.meta.dir, "../../../../../drizzle"),
		});
		const projectId = randomUUID(),
			workspaceId = randomUUID();
		db.insert(schema.projects)
			.values({ id: projectId, name: "Project", repoPath: repo })
			.run();
		db.insert(schema.workspaces)
			.values({
				id: workspaceId,
				name: "Saved conversation",
				type: "session",
				worktreePath: join(root, "old-conversation"),
				branch: "main",
			})
			.run();
		let running = true,
			closed = 0;
		const ctx = {
			db,
			isAuthenticated: true,
			organizationId: "test",
			eventBus: new Proxy({}, { get: () => () => {} }),
			git: async (path: string) => factory(path),
			runtime: {
				chat: () => ({
					commands: {
						listSessions: () => [
							{
								sessionId: "kept-history",
								live: true,
								status: running ? "running" : "idle",
								queuedCount: 0,
							},
						],
						closeSession: async () => {
							closed++;
						},
					},
				}),
			},
		} as unknown as HostServiceContext;
		const caller = workspaceRouter.createCaller(ctx);
		await expect(
			caller.connectProject({ id: workspaceId, projectId, worktreePath: task }),
		).rejects.toThrow("Wait for the chat");
		expect(db.query.workspaces.findFirst().sync()?.type).toBe("session");
		running = false;
		const connected = await caller.connectProject({
			id: workspaceId,
			projectId,
			worktreePath: task,
		});
		expect(connected.workspace?.id).toBe(workspaceId);
		expect(connected.workspace?.name).toBe("Saved conversation");
		expect(db.query.workspaces.findFirst().sync()?.type).toBe("worktree");
		expect(closed).toBe(1);
		await caller.connectProject({
			id: workspaceId,
			projectId,
			worktreePath: task,
		});
		expect(closed).toBe(1);
		sqlite.close();
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
