import { createRequire } from "node:module";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(root, "apps/desktop/package.json"));
const asar = require(
	resolve(
		root,
		"node_modules/.bun/@electron+asar@3.4.1/node_modules/@electron/asar",
	),
);
const original = "/Applications/Superset.app";
const output = resolve(root, ".cache/personal-desktop", String(Date.now()));
const application = resolve(output, "Peixoto IA.app");
const extracted = resolve(output, "archive");
const dist = resolve(root, "apps/desktop/dist");
if (!existsSync(resolve(dist, "renderer/index.html")))
	throw new Error("Compile the desktop first");
mkdirSync(output, { recursive: true });
execFileSync("ditto", [original, application]);
asar.extractAll(resolve(original, "Contents/Resources/app.asar"), extracted);
cpSync(dist, resolve(extracted, "dist"), { recursive: true });
const pkg = resolve(extracted, "package.json");
const metadata = JSON.parse(readFileSync(pkg, "utf8"));
metadata.version = "2.0.11-peixoto.2";
writeFileSync(pkg, JSON.stringify(metadata, null, 2));
const archive = resolve(application, "Contents/Resources/app.asar");
await asar.createPackageWithOptions(extracted, archive, {
	unpackDir: "node_modules",
});
rmSync(extracted, { recursive: true });
const hash = createHash("sha256")
	.update(asar.getRawHeader(archive).headerString)
	.digest("hex");
const plist = resolve(application, "Contents/Info.plist");
const edit = (command) =>
	execFileSync("/usr/libexec/PlistBuddy", ["-c", command, plist]);
edit("Set :CFBundleDisplayName Peixoto IA");
edit("Set :CFBundleIdentifier com.peixoto.paradev.personal");
edit("Set :CFBundleShortVersionString 2.0.11-peixoto.2");
edit(`Set :ElectronAsarIntegrity:Resources/app.asar:hash ${hash}`);
edit("Add :LSEnvironment:DISABLE_UPDATE_CHECK string 1");
execFileSync("codesign", ["--force", "--deep", "--sign", "-", application], {
	stdio: "inherit",
});
execFileSync("codesign", ["--verify", "--deep", "--strict", application], {
	stdio: "inherit",
});
console.log(application);
