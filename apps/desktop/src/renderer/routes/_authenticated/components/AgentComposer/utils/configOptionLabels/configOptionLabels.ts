import { msg } from "@lingui/core/macro";
import { i18n } from "@superset/i18n";
import type { SessionConfigOption } from "@superset/chat/protocol";
import { fastOption } from "../toggleOption";

const KNOWN_LABELS = {
	Default: msg({ message: "Default" }),
	Low: msg({ message: "Low" }),
	Medium: msg({ message: "Medium" }),
	High: msg({ message: "High" }),
	Model: msg({ message: "Model" }),
	Mode: msg({ message: "Mode" }),
	"Thinking Level": msg({ message: "Reasoning" }),
};
export function agentOptionLabel(label: string) {
	const known = KNOWN_LABELS[label as keyof typeof KNOWN_LABELS];
	return known ? i18n._(known) : label;
}
export function currentLabel(option: SessionConfigOption | undefined) {
	const label = option?.options.find(
		(entry) => entry.id === option.currentValue,
	)?.label;
	return label && option?.category !== "model"
		? agentOptionLabel(label)
		: label;
}

export function configOptionLabels(configOptions: SessionConfigOption[]) {
	const model = configOptions.find(
		(option) => option.category === "model" && option.options.length > 0,
	);
	const effort = configOptions.find(
		(option) => option.category === "thought_level",
	);
	const fast = fastOption(configOptions);
	return {
		model: currentLabel(model) ?? model?.label,
		effort: currentLabel(effort),
		fast: fast ? fast.currentValue === "on" : undefined,
	};
}
