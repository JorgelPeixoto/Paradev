import { Trans } from "@lingui/react/macro";
import { LuSquarePen } from "react-icons/lu";
import { SidebarKbdHint } from "renderer/components/SidebarKbdHint";
import { useHotkeyDisplay } from "renderer/hotkeys";
import { useOpenNewSession } from "renderer/hooks/useOpenNewWorkspace";

export function SidebarNewWorkspaceButton() {
	const openNewWorkspace = useOpenNewSession();
	const shortcutText = useHotkeyDisplay("NEW_WORKSPACE").text;
	return (
		<button
			type="button"
			onClick={openNewWorkspace}
			className="group flex h-8 w-full items-center gap-2 rounded-xl px-1.5 text-[14px] font-normal text-foreground/80 transition-colors hover:bg-fill-hover hover:text-foreground"
		>
			<div className="flex size-5 shrink-0 items-center justify-center rounded">
				<LuSquarePen className="size-4" strokeWidth={1.7} />
			</div>
			<span className="flex-1 truncate text-left whitespace-nowrap">
				<Trans>New chat</Trans>
			</span>
			<SidebarKbdHint label={shortcutText} />
		</button>
	);
}
