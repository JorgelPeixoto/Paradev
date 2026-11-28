#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const source = resolve(process.argv[2] ?? "");
const checkOnly = process.argv.includes("--check");
const destination = "/Applications/Peixoto IA.app";
const release = JSON.parse(
	readFileSync(join(source, "Contents/Resources/peixoto-build.json"), "utf8"),
);
if (
	!/^2\.0\.11-peixoto\.\d+$/.test(release.version) ||
	!/^[a-f0-9]{40}$/.test(release.commit)
)
	throw new Error("Pacote sem identificação de versão válida");
const sourcePlist = join(source, "Contents/Info.plist");
const plist = (path, key) =>
	execFileSync("/usr/libexec/PlistBuddy", ["-c", `Print :${key}`, path], {
		encoding: "utf8",
	}).trim();
if (
	plist(sourcePlist, "CFBundleShortVersionString") !== release.version ||
	plist(sourcePlist, "CFBundleIdentifier") !== "com.peixoto.paradev.personal"
)
	throw new Error("Identidade do pacote não confere");
execFileSync("codesign", ["--verify", "--deep", "--strict", source], {
	stdio: "inherit",
});
const state = join(homedir(), ".local/share/peixoto-ia");
mkdirSync(state, { recursive: true });
const registry = join(state, "installed.json");
const revision = (value) => Number(value.match(/-peixoto\.(\d+)$/)?.[1] ?? 0);
const installed = existsSync(destination)
	? plist(
			join(destination, "Contents/Info.plist"),
			"CFBundleShortVersionString",
		)
	: "";
const registered = existsSync(registry)
	? JSON.parse(readFileSync(registry, "utf8")).version
	: "";
if (
	revision(release.version) <
	Math.max(revision(installed), revision(registered))
)
	throw new Error(
		"Instalação recusada: o pacote é anterior à versão já instalada",
	);
const archiveHash = createHash("sha256")
	.update(readFileSync(join(source, "Contents/Resources/app.asar")))
	.digest("hex");
if (checkOnly) {
	console.log(
		JSON.stringify({
			pronto: true,
			versao: release.version,
			commit: release.commit,
			versao_atual: installed,
			sha256: archiveHash,
		}),
	);
} else {
	const processes = execFileSync("ps", ["-axo", "command="], {
		encoding: "utf8",
	});
	if (
		processes
			.split("\n")
			.some((line) => line.trim().startsWith(`${destination}/Contents/MacOS/`) && !line.includes("/dist/main/pty-daemon.js "))
	)
		throw new Error(
			"O Peixoto IA está aberto. Preserve os comandos em execução e encerre o aplicativo antes de instalar.",
		);
	const staging = join(state, `staging-${Date.now()}.app`);
	execFileSync("ditto", [source, staging]);
	execFileSync("codesign", ["--verify", "--deep", "--strict", staging]);
	const backup = join(
		state,
		`backup-${installed || "sem-versao"}-${Date.now()}.app`,
	);
	if (existsSync(destination)) renameSync(destination, backup);
	try {
		renameSync(staging, destination);
	} catch (error) {
		if (existsSync(backup) && !existsSync(destination))
			renameSync(backup, destination);
		throw error;
	}
	cpSync(
		join(destination, "Contents/Resources/peixoto-build.json"),
		join(state, "current-build.json"),
	);
	cpSync(
		join(destination, "Contents/Resources/peixoto-tools"),
		join(state, "tools"),
		{ recursive: true },
	);
	const bin = join(homedir(), ".local/bin");
	mkdirSync(bin, { recursive: true });
	const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
	writeFileSync(
		join(bin, "peixoto-doctor"),
		`#!/bin/sh\nexec ${quote(process.execPath)} ${quote(join(state, "tools/doctor.mjs"))} "$@"\n`,
		{ mode: 0o755 },
	);
	writeFileSync(
		join(bin, "peixoto-validar-3d"),
		`#!/bin/sh\nexec ${quote(join(homedir(), "Developer/entregas/ferramentas/.venv3d/bin/python"))} ${quote(join(state, "tools/validate-3d.py"))} "$@"\n`,
		{ mode: 0o755 },
	);
	writeFileSync(
		registry,
		JSON.stringify(
			{
				...release,
				sha256: archiveHash,
				installedAt: new Date().toISOString(),
				backup,
			},
			null,
			2,
		),
	);
	console.log(
		JSON.stringify({
			instalada: release.version,
			commit: release.commit,
			backup,
		}),
	);
}
