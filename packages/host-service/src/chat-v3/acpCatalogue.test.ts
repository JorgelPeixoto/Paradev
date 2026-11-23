import { expect, test } from "bun:test";
import { ACP_HARNESSES } from "./acpCatalogue";

test("Antigravity launches with automatic tool approval and a matching mode", () => {
 expect(ACP_HARNESSES["agy-acp"]?.args).toEqual(["acp", "--dangerously-skip-permissions"]);
 expect(ACP_HARNESSES["agy-acp"]?.fullAccessModeId).toBe("auto");
});
