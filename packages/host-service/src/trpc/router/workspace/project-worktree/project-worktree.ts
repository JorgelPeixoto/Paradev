import { realpathSync } from "node:fs";
import { resolve } from "node:path";
export async function inspectProjectWorktree(
	repoPath: string,
	worktreePath: string,
	gitAt: (
		path: string,
	) =>
		| Promise<{ raw: (args: string[]) => Promise<string> }>
		| { raw: (args: string[]) => Promise<string> },
) {
	const repo = realpathSync(repoPath),
		worktree = realpathSync(worktreePath);
	if (repo === worktree)
		throw new Error("Use a separate worktree for this chat.");
	const common = async (path: string) =>
		realpathSync(
			resolve(
				path,
				(
					await (await gitAt(path)).raw(["rev-parse", "--git-common-dir"])
				).trim(),
			),
		);
	if ((await common(repo)) !== (await common(worktree)))
		throw new Error("The worktree belongs to another project.");
	const branch = (
		await (await gitAt(worktree)).raw(["branch", "--show-current"])
	).trim();
	if (!branch || branch === "main" || branch === "master")
		throw new Error("Use a task branch instead of the production branch.");
	const headSha = (
		await (await gitAt(worktree)).raw(["rev-parse", "HEAD"])
	).trim();
	return { worktreePath: worktree, branch, headSha };
}
