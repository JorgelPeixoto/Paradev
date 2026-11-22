import { expect, test } from "bun:test";
import { pageUrl, selectPreviewPort, openPreviewPage } from "./previewTarget";
test("accepts web addresses and excludes executable or local file schemes", () => {
	expect(pageUrl("localhost:5173")).toBe("http://localhost:5173/");
	expect(pageUrl("https://example.com/page")).toBe("https://example.com/page");
	expect(pageUrl("javascript:alert(1)")).toBeNull();
	expect(pageUrl("file:///Users/me/private.txt")).toBeNull();
	expect(selectPreviewPort([{ port: 5432 }, { port: 5173 }])?.port).toBe(5173);
	expect(selectPreviewPort([{ port: 5432 }])).toBeUndefined();
});

test("reuses an existing page even after URL normalization instead of opening duplicate tabs", async () => {
	const calls: string[] = [];
	const panes = {
		list: {
			query: async () => ({
				layout: {
					sidebar: {
						tabs: [
							{
								panes: [
									{ id: "kept", browser: { url: "http://localhost:5173" } },
								],
							},
						],
					},
				},
			}),
		},
		sidebar: {
			mutate: async () => {
				calls.push("sidebar");
			},
		},
		focus: {
			mutate: async ({ paneId }: { paneId: string }) => {
				calls.push(paneId);
			},
		},
		open: {
			mutate: async () => {
				calls.push("new");
			},
		},
	};
	expect(
		await openPreviewPage(panes, "workspace", "http://localhost:5173/"),
	).toBe("reused");
	expect(calls).toEqual(["sidebar", "kept"]);
	expect(await openPreviewPage(panes, "workspace", "https://example.com")).toBe(
		"opened",
	);
	expect(calls.at(-1)).toBe("new");
	await expect(
		openPreviewPage(panes, "workspace", "file:///private/secret"),
	).rejects.toThrow("Invalid");
});
