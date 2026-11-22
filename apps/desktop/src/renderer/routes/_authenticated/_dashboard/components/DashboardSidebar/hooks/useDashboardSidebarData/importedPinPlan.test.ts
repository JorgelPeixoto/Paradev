import { expect, test } from "bun:test";
import { importedPinPlan } from "./importedPinPlan";

test("pins imports in import order without moving existing pins or new sessions", () => {
	const workspaces = [{id:"first",tags:["importadas"]},{id:"second",tags:["importadas"]},{id:"new",tags:[]}];
	const rows = ["new", "second", "first"].map(workspaceId => ({workspaceId,sidebarState:{pinnedAt:workspaceId === "second" ? 10 : null}}));
	expect(importedPinPlan(workspaces,rows,100)).toEqual([{workspaceId:"first",pinnedAt:100},{workspaceId:"second",pinnedAt:10}]);
});
test("respects manual unpin after migration and leaves missing placement rows alone", () => {
	expect(importedPinPlan([{id:"a",tags:["importadas"]},{id:"missing",tags:["importadas"]}], [{workspaceId:"a",sidebarState:{pinnedAt:null,importPinMigrated:true}}],100)).toEqual([]);
});
