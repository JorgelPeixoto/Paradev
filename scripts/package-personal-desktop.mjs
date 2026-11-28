import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(root, "apps/desktop/package.json"));
const asar = require(
	resolve(
		root,
		"node_modules/.bun/@electron+asar@3.4.1/node_modules/@electron/asar",
	),
);
const version = "2.0.11-peixoto.12";
const commit = execFileSync("git", ["rev-parse", "HEAD"], {
	cwd: root,
	encoding: "utf8",
}).trim();
if (
	execFileSync("git", ["status", "--porcelain"], {
		cwd: root,
		encoding: "utf8",
	}).trim()
)
	throw new Error("Commit the verified source before packaging.");
const build = JSON.parse(
	readFileSync(resolve(root, "apps/desktop/dist/peixoto-build.json"), "utf8"),
);
if (build.commit !== commit || build.version !== version)
	throw new Error("Build metadata does not match this source revision.");
const original = "/Applications/Superset.app";
const installedPlist = "/Applications/Peixoto IA.app/Contents/Info.plist";
if (existsSync(installedPlist)) {
	const installed = execFileSync(
		"/usr/libexec/PlistBuddy",
		["-c", "Print :CFBundleShortVersionString", installedPlist],
		{ encoding: "utf8" },
	).trim();
	const revision = Number(installed.match(/-peixoto\.(\d+)$/)?.[1] ?? 0);
	if (revision > 12)
		throw new Error(
			`Installed release ${installed} is newer; build from the current branch.`,
		);
}
const output = resolve(root, ".cache/personal-desktop", String(Date.now()));
const application = resolve(output, "Peixoto IA.app");
const extracted = resolve(output, "archive");
const dist = resolve(root, "apps/desktop/dist");
if (!existsSync(resolve(dist, "renderer/index.html")))
	throw new Error("Compile the desktop first");
mkdirSync(output, { recursive: true });
execFileSync("ditto", [original, application]);
asar.extractAll(resolve(original, "Contents/Resources/app.asar"), extracted);
rmSync(resolve(extracted, "dist"), { recursive: true, force: true });
cpSync(dist, resolve(extracted, "dist"), { recursive: true });
const pkg = resolve(extracted, "package.json");
const metadata = JSON.parse(readFileSync(pkg, "utf8"));
metadata.version = "2.0.11-peixoto.12";
writeFileSync(pkg, JSON.stringify(metadata, null, 2));
const mark = resolve(root, "apps/desktop/src/renderer/assets/peixoto-mark.png");
for (const name of ["icon.png", "icon-dev.png", "icon-canary.png"])
	cpSync(mark, resolve(extracted, "resources/build/icons", name));
const iconSet = resolve(output, "Peixoto.iconset");
mkdirSync(iconSet);
for (const size of [16, 32, 128, 256, 512]) {
	for (const scale of [1, 2]) {
		const suffix = scale === 2 ? "@2x" : "";
		execFileSync("sips", [
			"-z",
			String(size * scale),
			String(size * scale),
			mark,
			"--out",
			resolve(iconSet, `icon_${size}x${size}${suffix}.png`),
		]);
	}
}
execFileSync("iconutil", [
	"-c",
	"icns",
	iconSet,
	"-o",
	resolve(application, "Contents/Resources/peixoto.icns"),
]);
cpSync(
	resolve(root, "apps/desktop/dist/peixoto-build.json"),
	resolve(application, "Contents/Resources/peixoto-build.json"),
);
cpSync(
	resolve(root, "scripts/peixoto"),
	resolve(application, "Contents/Resources/peixoto-tools"),
	{ recursive: true },
);
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
edit("Set :CFBundleIconFile peixoto.icns");
edit("Set :CFBundleIdentifier com.peixoto.paradev.personal");
edit("Set :CFBundleShortVersionString 2.0.11-peixoto.12");
edit(`Set :ElectronAsarIntegrity:Resources/app.asar:hash ${hash}`);
edit("Add :LSEnvironment:DISABLE_UPDATE_CHECK string 1");
const resources = resolve(application, "Contents/Resources");
for (const name of readdirSync(resources).filter((name) =>
	name.endsWith(".lproj"),
)) {
	const localizedName = resolve(resources, name, "InfoPlist.strings");
	if (existsSync(localizedName))
		writeFileSync(
			localizedName,
			readFileSync(localizedName, "utf8").replace(
				/("CFBundle(?:DisplayName|Name)"\s*=\s*")[^"]+(";)/g,
				"$1Peixoto IA$2",
			),
		);
}
execFileSync("codesign", ["--force", "--deep", "--sign", "-", application], {
	stdio: "inherit",
});
execFileSync("codesign", ["--verify", "--deep", "--strict", application], {
	stdio: "inherit",
});
console.log(application);
