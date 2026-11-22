import { msg } from "@lingui/core/macro";
import { i18n } from "@superset/i18n";

export function formatQuotaLabel(label: string): string {
	if (label === "Session (5h)") return i18n._(msg({ message: "Session (5h)" }));
	if (label === "Weekly") return i18n._(msg({ message: "Weekly" }));
	if (label.startsWith("Weekly · ")) return `${i18n._(msg({ message: "Weekly" }))} · ${label.slice(9)}`;
	return label;
}
