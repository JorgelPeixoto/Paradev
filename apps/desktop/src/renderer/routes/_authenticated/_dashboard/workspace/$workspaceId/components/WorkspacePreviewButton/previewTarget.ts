export function pageUrl(input: string): string | null {
	const value = input.trim();
	if (!value) return null;
	try {
		const url = new URL(value.includes("://") ? value : `http://${value}`);
		return ["http:", "https:"].includes(url.protocol) ? url.href : null;
	} catch {
		return null;
	}
}
export function selectPreviewPort(
	ports: { port: number; label?: string | null }[],
) {
	return (
		ports.find((row) =>
			/web|vite|next|preview|frontend/i.test(row.label ?? ""),
		) ??
		ports.find((row) => [5173, 3000, 8080, 8000, 4173, 4200].includes(row.port))
	);
}

type PreviewPanes = {
	list: {
		query(input: {
			workspaceId: string;
		}): Promise<{
			layout: {
				sidebar?: {
					tabs: { panes: { id: string; browser?: { url: string } | null }[] }[];
				};
			};
		}>;
	};
	sidebar: {
		mutate(input: {
			workspaceId: string;
			open: boolean;
			fullScreen: boolean;
		}): Promise<unknown>;
	};
	focus: {
		mutate(input: { workspaceId: string; paneId: string }): Promise<unknown>;
	};
	open: {
		mutate(input: {
			workspaceId: string;
			tool: "browser";
			url: string;
		}): Promise<unknown>;
	};
};
export async function openPreviewPage(
	panes: PreviewPanes,
	workspaceId: string,
	address: string,
) {
	const url = pageUrl(address);
	if (!url) throw new Error("Invalid page address.");
	const current = await panes.list.query({ workspaceId });
	const pane = (current.layout.sidebar?.tabs ?? [])
		.flatMap((tab) => tab.panes)
		.find((p) => p.browser && pageUrl(p.browser.url) === url);
	if (pane) {
		await panes.sidebar.mutate({ workspaceId, open: true, fullScreen: false });
		await panes.focus.mutate({ workspaceId, paneId: pane.id });
		return "reused";
	}
	await panes.open.mutate({ workspaceId, tool: "browser", url });
	return "opened";
}
