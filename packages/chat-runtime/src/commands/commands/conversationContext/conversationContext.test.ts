import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { conversationContext } from "./conversationContext";

test("archives the complete long history while including recent whole messages", () => {
 const dir = mkdtempSync(join(tmpdir(), "conversation-context-"));
 try {
  const messages = [{role:"user",text:"old ".repeat(22000)}, {role:"assistant",text:"recent answer"}];
  const result = conversationContext(messages,dir,"session-test");
  const archive = join(dir,"session-test.json");
  expect(JSON.parse(readFileSync(archive,"utf8"))).toEqual(messages);
  expect(statSync(archive).mode & 0o777).toBe(0o600);
  expect(result).toContain(archive);
  expect(result).toContain("recent answer");
  expect(result).not.toContain("old ".repeat(22000));
 } finally { rmSync(dir,{recursive:true}); }
});
