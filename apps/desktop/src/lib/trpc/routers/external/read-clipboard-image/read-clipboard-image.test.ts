import { expect, test } from "bun:test";
import { readClipboardImage } from "./read-clipboard-image";
test("reads only image bytes without reading clipboard text and enforces the size bound", async () => {
	const reads: string[] = [];
	const item = {
		types: ["text/plain", "image/png"],
		getType: async (type: string) => {
			reads.push(type);
			return new Blob(["image bytes"], { type });
		},
	};
	expect(await readClipboardImage(async () => [item])).toEqual({
		mimeType: "image/png",
		data: Buffer.from("image bytes").toString("base64"),
	});
	expect(reads).toEqual(["image/png"]);
	expect(
		await readClipboardImage(async () => [{ ...item, types: ["text/plain"] }]),
	).toBeNull();
	await expect(
		readClipboardImage(async () => [
			{
				types: ["image/png"],
				getType: async () => ({
					size: 26 * 1024 * 1024,
					arrayBuffer: async () => new ArrayBuffer(0),
				}),
			},
		]),
	).rejects.toThrow("25 MB");
});
