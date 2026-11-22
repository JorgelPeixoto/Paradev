import { createRequire } from "node:module";
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
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
metadata.version = "2.0.11-peixoto.5";
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
edit("Set :CFBundleShortVersionString 2.0.11-peixoto.5");
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
