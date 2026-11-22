interface ImportedWorkspace {
	id: string;
	tags?: string[] | null;
}
interface SidebarRow {
	workspaceId: string;
	sidebarState: {
		pinnedAt: number | null;
		importPinMigrated?: boolean;
	};
}

/** Preserve import order and every existing pin; ordinary new sessions stay below. */
export function importedPinPlan(workspaces: readonly ImportedWorkspace[], rows: readonly SidebarRow[], now: number) {
	const byId = new Map(rows.map(row => [row.workspaceId, row]));
	let next = rows.reduce((latest, row) => Math.max(latest, (row.sidebarState.pinnedAt ?? 0) + 1), now);
	return workspaces.flatMap(workspace => {
		const row = byId.get(workspace.id);
		if (!workspace.tags?.includes("importadas") || !row || row.sidebarState.importPinMigrated) return [];
		return [{ workspaceId: workspace.id, pinnedAt: row.sidebarState.pinnedAt ?? next++ }];
	});
}
