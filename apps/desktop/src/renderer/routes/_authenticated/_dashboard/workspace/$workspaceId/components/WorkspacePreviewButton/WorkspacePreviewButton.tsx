import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import { Input } from "@superset/ui/input";
import { Popover, PopoverTrigger, PopoverContent } from "@superset/ui/popover";
import { toast } from "@superset/ui/sonner";
import { ChevronDown, Globe, Play, Settings } from "lucide-react";
import { useState } from "react";
import { useWorkspaceHostUrl } from "renderer/hooks/host-service/useWorkspaceHostUrl";
import { getHostServiceClientByUrl } from "renderer/lib/host-service-client";
import { useWorkspace } from "../../../providers/WorkspaceProvider";
import { useConfigureWorkspaceRun } from "../../hooks/useConfigureWorkspaceRun";
import type { useWorkspaceRun } from "../../hooks/useWorkspaceRun";
import {
	lastActiveChatComposer,
	useChatComposerStore,
} from "../../hooks/usePaneRegistry/stores/chatComposerStore";
import { openPreviewPage, pageUrl, selectPreviewPort } from "./previewTarget";

export function WorkspacePreviewButton({
	run,
}: {
	run: ReturnType<typeof useWorkspaceRun>;
}) {
	const { workspace } = useWorkspace();
	const hostUrl = useWorkspaceHostUrl(workspace.id);
	const { t } = useLingui();
	const configure = useConfigureWorkspaceRun(
		workspace.projectId,
		run.definition,
	);
	const [open, setOpen] = useState(false),
		[busy, setBusy] = useState(false),
		[address, setAddress] = useState("");
	const [ports, setPorts] = useState<{ port: number; label?: string | null }[]>(
		[],
	);
	async function show(url: string) {
		if (!hostUrl) return;
		const client = getHostServiceClientByUrl(hostUrl);
		await openPreviewPage(client.panes, workspace.id, url);
		setOpen(false);
	}
	async function discover(automatic: boolean) {
		if (!hostUrl) return;
		setBusy(true);
		try {
			const client = getHostServiceClientByUrl(hostUrl),
				found = await client.ports.getAll.query({
					workspaceIds: [workspace.id],
				});
			setPorts(found);
			if (automatic) {
				const selected = selectPreviewPort(found);
				if (selected) {
					await show(`http://127.0.0.1:${selected.port}`);
					return;
				}
				const layout = await client.panes.list.query({
					workspaceId: workspace.id,
				});
				const existing = (layout.layout.sidebar?.tabs ?? [])
					.flatMap((tab) => tab.panes)
					.find((p) => p.browser);
				if (existing?.browser) {
					await show(existing.browser.url);
					return;
				}
			}
			setOpen(true);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		} finally {
			setBusy(false);
		}
	}
	async function submit(input = address) {
		const url = pageUrl(input);
		if (!url) return;
		setBusy(true);
		try {
			await show(url);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		} finally {
			setBusy(false);
		}
	}
	return (
		<div className="flex shrink-0 items-center gap-0.5">
			<Button
				type="button"
				size="sm"
				variant="outline"
				onClick={() => void discover(true)}
				disabled={busy || !hostUrl}
			>
				<Globe className="size-3.5" />
				<Trans>View page</Trans>
			</Button>
			<Popover
				open={open}
				onOpenChange={(value) => {
					setOpen(value);
					if (value) void discover(false);
				}}
			>
				<PopoverTrigger asChild>
					<Button
						type="button"
						size="icon-sm"
						variant="ghost"
						aria-label={t({ message: "Preview" })}
					>
						<ChevronDown className="size-3.5" />
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-80 space-y-3">
					<p className="text-xs text-muted-foreground">
						<Trans>
							Preview your dev server next to your terminals. Your agent can
							click through it and check its own work.
						</Trans>
					</p>
					<form
						className="flex gap-2"
						onSubmit={(event) => {
							event.preventDefault();
							void submit();
						}}
					>
						<Input
							value={address}
							onChange={(e) => setAddress(e.target.value)}
							placeholder={t({ message: "Enter URL..." })}
							aria-label={t({ message: "Enter URL..." })}
						/>
						<Button
							type="submit"
							size="sm"
							disabled={busy || !pageUrl(address)}
						>
							<Trans>Open</Trans>
						</Button>
					</form>
					{ports.map((port) => (
						<Button
							key={port.port}
							type="button"
							variant="ghost"
							size="sm"
							className="w-full justify-start"
							onClick={() => {
								setAddress(`http://127.0.0.1:${port.port}`);
								void submit(`http://127.0.0.1:${port.port}`);
							}}
						>
							{port.label ?? "localhost"}:{port.port}
						</Button>
					))}
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="w-full"
						disabled={run.isPending || run.isRunning}
						onClick={() => {
							if (run.definition) void run.toggleWorkspaceRun();
							else {
								const current = lastActiveChatComposer(
									useChatComposerStore.getState().composers,
									workspace.id,
								);
								if (current?.startPreview?.()) setOpen(false);
								else configure();
							}
						}}
					>
						{run.definition ? (
							<Play className="size-3.5" />
						) : (
							<Settings className="size-3.5" />
						)}
						<Trans>Run</Trans>
					</Button>
				</PopoverContent>
			</Popover>
		</div>
	);
}
