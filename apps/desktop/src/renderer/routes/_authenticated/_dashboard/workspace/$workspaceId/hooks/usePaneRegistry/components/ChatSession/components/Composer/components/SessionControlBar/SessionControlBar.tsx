import { Trans, useLingui } from "@lingui/react/macro";
import type { SessionConfigOption } from "@superset/chat/protocol";
import { formatPercent } from "@superset/i18n/format";
import { Button } from "@superset/ui/button";
import { Check, Minimize2, Gauge } from "lucide-react";
import { useHostProjects } from "renderer/hooks/host-projects/useHostProjects";
import { useHostUsageQuota } from "renderer/hooks/host-service/useHostUsageQuota";
import { configOptionLabels } from "renderer/routes/_authenticated/components/AgentComposer/utils/configOptionLabels";
import { useHostWorkspaces } from "renderer/routes/_authenticated/providers/HostWorkspacesProvider";
import { useAccountUsage } from "../../../../../../hooks/useAccountUsage";
import {
	AccountMenu,
	type SwitchAccount,
} from "../../../SessionView/components/UsageLimitNotice/UsageLimitNotice";

export function SessionControlBar({
	workspaceId,
	terminalId,
	presetId,
	agentLabel,
	configOptions,
	onSwitchAccount,
	onCompact,
	compactDisabled,
	compacted,
	onStatus,
}: {
	workspaceId: string;
	terminalId: string;
	presetId?: string;
	agentLabel?: string;
	configOptions: SessionConfigOption[];
	onSwitchAccount?: SwitchAccount;
	onCompact?: () => void;
	compactDisabled: boolean;
	compacted: boolean;
	onStatus: () => void;
}) {
	const { t } = useLingui();
	const { account, binding, hostUrl, status, tightest, state } =
		useAccountUsage(workspaceId, terminalId);
	const quota = useHostUsageQuota(hostUrl);
	const { workspaces } = useHostWorkspaces();
	const { projects } = useHostProjects();
	const workspace = workspaces.find((row) => row.id === workspaceId);
	const project = projects.find((row) => row.id === workspace?.projectId);
	const { model, effort } = configOptionLabels(configOptions);
	const agent =
		presetId === "claude" || presetId === "codex" ? presetId : undefined;
	const accounts = (quota.data ?? []).filter((row) => row.agent === agent);
	return (
		<section
			className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs"
			aria-label={t({ message: "Session status" })}
		>
			<div className="min-w-0 flex-1 basis-48">
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
					<span>{agentLabel ?? binding?.agentId ?? presetId}</span>
					<span className="text-muted-foreground">
						{model ?? t({ message: "Default" })}
						{effort ? ` · ${effort}` : ""}
					</span>
				</div>
				<div
					className="mt-0.5 truncate text-muted-foreground"
					title={workspace?.worktreePath}
				>
					<Trans>Project</Trans>: {project?.name ?? workspace?.name ?? "—"}
					{workspace?.branch ? ` · ${workspace.branch}` : ""}
				</div>
			</div>
			{agent ? (
				<AccountMenu
					accounts={accounts}
					agent={agent}
					current={account ?? undefined}
					email={binding?.account?.email ?? account?.email ?? undefined}
					hostUrl={hostUrl}
					onSwitch={compactDisabled ? undefined : onSwitchAccount}
				/>
			) : null}
			<button
				type="button"
				onClick={onStatus}
				className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
				title={t({ message: "Usage settings" })}
			>
				<Gauge className="size-3.5" />
				{tightest && (state === "ready" || state === "stale")
					? `${tightest.label} · ${formatPercent(tightest.usedPercent / 100)}`
					: (status ?? t({ message: "Session status" }))}
			</button>
			<div className="flex items-center gap-1">
				{onCompact ? (
					<Button
						type="button"
						variant="ghost"
						size="xs"
						onClick={onCompact}
						disabled={compactDisabled}
						title={t({ message: "Available when the agent is idle." })}
					>
						{compacted && !compactDisabled ? (
							<Check className="size-3.5" />
						) : (
							<Minimize2 className="size-3.5" />
						)}
						<Trans>Compact now</Trans>
					</Button>
				) : null}
			</div>
		</section>
	);
}
