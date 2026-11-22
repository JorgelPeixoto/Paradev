const TYPES: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	webp: "image/webp",
	gif: "image/gif",
	svg: "image/svg+xml",
	pdf: "application/pdf",
	txt: "text/plain",
	md: "text/markdown",
	csv: "text/csv",
	json: "application/json",
	html: "text/html",
	css: "text/css",
	js: "text/javascript",
	ts: "text/plain",
	tsx: "text/plain",
	py: "text/plain",
	yaml: "text/plain",
	yml: "text/plain",
	mp4: "video/mp4",
	mov: "video/quicktime",
	mp3: "audio/mpeg",
	wav: "audio/wav",
};
export function attachmentMediaType(file: { name: string; type: string }) {
	if (file.type && file.type !== "application/octet-stream") return file.type;
	return (
		TYPES[file.name.split(".").pop()?.toLowerCase() ?? ""] ||
		file.type ||
		"application/octet-stream"
	);
}
