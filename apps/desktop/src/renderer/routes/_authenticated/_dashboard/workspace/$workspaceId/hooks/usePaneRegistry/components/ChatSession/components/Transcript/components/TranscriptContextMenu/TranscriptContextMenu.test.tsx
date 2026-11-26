import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { TranscriptContextMenu } from "./TranscriptContextMenu";

afterEach(cleanup);

test("select all selects the mounted transcript instead of a ref callback", async () => {
 const container = document.createElement("div");
 container.textContent = "Mensagem com https://example.com";
 document.body.append(container);
 try {
  const view = render(<TranscriptContextMenu selectionContainer={container}><div>Mensagem</div></TranscriptContextMenu>);
  fireEvent.contextMenu(view.getByText("Mensagem"));
  fireEvent.click(await screen.findByText("Select All"));
  expect(window.getSelection()?.toString()).toBe(container.textContent);
 } finally { container.remove(); window.getSelection()?.removeAllRanges(); }
});
