export async function readClipboardImage(
	read: () => Promise<
		{ types: readonly string[]; getType: (type: string) => Promise<unknown> }[]
	>,
) {
	for (const item of await read()) {
		const type = ["image/png", "image/jpeg", "image/webp", "image/gif"].find(
			(mime) => item.types.includes(mime),
		);
		if (!type) continue;
		const candidate = await item.getType(type);
		if (
			!candidate ||
			typeof candidate !== "object" ||
			!("size" in candidate) ||
			typeof candidate.size !== "number" ||
			!("arrayBuffer" in candidate) ||
			typeof candidate.arrayBuffer !== "function"
		)
			continue;
		const blob = candidate as {
			size: number;
			arrayBuffer(): Promise<ArrayBuffer>;
		};
		if (blob.size > 25 * 1024 * 1024)
			throw new Error("Clipboard image is larger than 25 MB.");
		return {
			mimeType: type,
			data: Buffer.from(await blob.arrayBuffer()).toString("base64"),
		};
	}
	return null;
}
