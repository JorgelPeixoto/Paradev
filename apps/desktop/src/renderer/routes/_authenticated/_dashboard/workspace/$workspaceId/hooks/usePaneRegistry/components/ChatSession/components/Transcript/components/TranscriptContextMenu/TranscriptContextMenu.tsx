import { Trans } from "@lingui/react/macro";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "@superset/ui/context-menu";
import {
	type MouseEvent as ReactMouseEvent,
	type ReactNode,
	useState,
} from "react";
import { LuCopy } from "react-icons/lu";
import { useCopyToClipboard } from "renderer/hooks/useCopyToClipboard";

const MESSAGE_SOURCE = "data-message-source";

function modifierKeyLabel() {
	return navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl+";
}

export function TranscriptContextMenu({
	children,
	selectionContainer,
}: {
	children: ReactNode;
	selectionContainer: HTMLElement | null;
}) {
	const { copyToClipboard } = useCopyToClipboard();
	const [selectionText, setSelectionText] = useState("");
	const [messageText, setMessageText] = useState("");

	const captureTarget = (event: ReactMouseEvent) => {
		setSelectionText(window.getSelection()?.toString() ?? "");
		const target = event.target;
		const message =
			target instanceof Element ? target.closest(`[${MESSAGE_SOURCE}]`) : null;
		setMessageText(message?.getAttribute(MESSAGE_SOURCE) ?? "");
	};

	const copySelection = () => {
		const text = window.getSelection()?.toString() || selectionText;
		if (text) copyToClipboard(text);
	};

	const copyMessage = () => {
		if (messageText) copyToClipboard(messageText);
	};

	const selectAll = () => {
		const container = selectionContainer;
		const selection = window.getSelection();
		if (!container || !selection) return;
		const range = document.createRange();
		range.selectNodeContents(container);
		selection.removeAllRanges();
		selection.addRange(range);
	};

	const modifier = modifierKeyLabel();

	return (
		<ContextMenu>
			<ContextMenuTrigger asChild onContextMenuCapture={captureTarget}>
				{children}
			</ContextMenuTrigger>
			<ContextMenuContent>
				<ContextMenuItem
					disabled={selectionText.trim().length === 0}
					onSelect={copySelection}
				>
					<LuCopy className="size-4" />
					<Trans>Copy</Trans>
					<ContextMenuShortcut>{`${modifier}C`}</ContextMenuShortcut>
				</ContextMenuItem>
				<ContextMenuItem disabled={!messageText} onSelect={copyMessage}>
					<Trans>Copy message</Trans>
				</ContextMenuItem>
				<ContextMenuSeparator />
				<ContextMenuItem onSelect={selectAll}>
					<Trans>Select All</Trans>
					<ContextMenuShortcut>{`${modifier}A`}</ContextMenuShortcut>
				</ContextMenuItem>
			</ContextMenuContent>
		</ContextMenu>
	);
}
