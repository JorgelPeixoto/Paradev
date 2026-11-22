import { afterEach, expect, test } from "bun:test";
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const { cleanup, render } = await import("@testing-library/react");
const { QuotaWindowRow } = await import("./QuotaWindowRow");
afterEach(cleanup);

test("renders remaining quota in both text and bar, including an empty exhausted bar", () => {
	const { container, rerender } = render(<QuotaWindowRow window={{id:"session",label:"Session (5h)",usedPercent:5,resetsAt:null}} />);
	expect(container.textContent).toContain("95%");
	expect(container.querySelector('[style]')?.getAttribute('style')).toContain("width: 95%");
	rerender(<QuotaWindowRow window={{id:"session",label:"Session (5h)",usedPercent:100,resetsAt:null}} />);
	expect(container.textContent).toContain("0%");
	expect(container.querySelector('[style]')?.getAttribute('style')).toContain("width: 0%");
});
