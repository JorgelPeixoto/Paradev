import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
if (
	execFileSync("git", ["status", "--porcelain"], {
		cwd: root,
		encoding: "utf8",
	}).trim()
)
	throw new Error("Confirme as alterações no Git antes de compilar");
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
	cwd: root,
	encoding: "utf8",
}).trim();
writeFileSync(
	resolve(root, "apps/desktop/dist/peixoto-build.json"),
	JSON.stringify(
		{ version: "2.0.11-peixoto.12", commit, builtAt: new Date().toISOString() },
		null,
		2,
	),
);
