import { expect, test } from "bun:test";
import { attachmentMediaType } from "./attachment-media-type";
test("infers types for Finder files while preserving an explicit media type", () => {
	expect(attachmentMediaType({ name: "CAPTURA.PNG", type: "" })).toBe(
		"image/png",
	);
	expect(
		attachmentMediaType({
			name: "notes.pdf",
			type: "application/octet-stream",
		}),
	).toBe("application/pdf");
	expect(attachmentMediaType({ name: "picture.png", type: "text/plain" })).toBe(
		"text/plain",
	);
	expect(attachmentMediaType({ name: "archive.unknown", type: "" })).toBe(
		"application/octet-stream",
	);
});
