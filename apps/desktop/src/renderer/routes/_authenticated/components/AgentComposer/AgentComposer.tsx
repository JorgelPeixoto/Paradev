import { Trans, useLingui } from "@lingui/react/macro";
import { Button } from "@superset/ui/button";
import { toast } from "@superset/ui/sonner";
import { ClipboardPaste, Paperclip, Image, Check } from "lucide-react";
import type {
	ComposerMentionProvider,
	PromptInputCommand,
	PromptInputLocalFiles,
	PromptInputHandle,
	PromptInputProps,
} from "@superset/chat-ui/PromptInput";
import { PromptInput } from "@superset/chat-ui/PromptInput";
import { useCallback, useMemo, useRef, useState } from "react";
import { track } from "renderer/lib/analytics";
import { electronTrpcClient } from "renderer/lib/trpc-client";
import { useAttachmentPreview } from "./hooks/useAttachmentPreview";
import { useComposerDictation } from "./hooks/useComposerDictation";
import { usePageMentionProvider } from "./hooks/usePageMentionProvider";
import { usePluginMentionProvider } from "./hooks/usePluginMentionProvider";
import { useTrackerMentionProvider } from "./hooks/useTrackerMentionProvider";

const NO_COMMANDS: PromptInputCommand[] = [];
const NO_PROVIDERS: ComposerMentionProvider[] = [];
const LOCAL_FILES: PromptInputLocalFiles = {
	pathOf: (file) => {
		try {
			return window.webUtils.getPathForFile(file) || undefined;
		} catch {
			return undefined;
		}
	},
	reveal: (path) => {
		void electronTrpcClient.external.openInFinder.mutate(path);
	},
};

export type AgentComposerProps = Omit<
	PromptInputProps,
	"mentionProviders" | "commands" | "onAttachmentClick" | "localFiles"
> & {
	imageInput?: boolean;
	mentionProviders?: ComposerMentionProvider[];
	commands?: PromptInputCommand[];
};

export function AgentComposer({
	ref,
	imageInput,
	commands = NO_COMMANDS,
	mentionProviders = NO_PROVIDERS,
	dictation,
	onSubmit,
	...props
}: AgentComposerProps) {
	const { t } = useLingui();
	const input = useRef<PromptInputHandle | null>(null);
	const [pasting, setPasting] = useState(false);
	const bindRef = useCallback(
		(value: PromptInputHandle | null) => {
			input.current = value;
			if (typeof ref === "function") ref(value);
			else if (ref) ref.current = value;
		},
		[ref],
	);
	async function pasteImage() {
		setPasting(true);
		try {
			const image =
				await electronTrpcClient.external.readClipboardImage.query();
			if (!image) {
				toast.info(t({ message: "No image on the clipboard." }));
				return;
			}
			const bytes = Uint8Array.from(atob(image.data), (c) => c.charCodeAt(0));
			const extension = image.mimeType.split("/")[1] ?? "png";
			input.current?.addFiles([
				new File([bytes], `captura-${Date.now()}.${extension}`, {
					type: image.mimeType,
				}),
			]);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : String(error));
		} finally {
			setPasting(false);
		}
	}
	const pluginProvider = usePluginMentionProvider();
	const pageProvider = usePageMentionProvider();
	const trackerProvider = useTrackerMentionProvider();
	const composerDictation = useComposerDictation();
	const attachmentPreview = useAttachmentPreview();
	const providers = useMemo(
		() => [
			pluginProvider,
			pageProvider,
			...(trackerProvider ? [trackerProvider] : []),
			...mentionProviders,
		],
		[pluginProvider, pageProvider, trackerProvider, mentionProviders],
	);
	const submit = useCallback<NonNullable<PromptInputProps["onSubmit"]>>(
		(payload) => {
			const result = onSubmit?.(payload);
			if (result !== false)
				track("composer_submitted", {
					used_dictation: payload.draft.usedDictation === true,
					attachments: payload.files.length,
					mentions: payload.mentions.length,
				});
			return result;
		},
		[onSubmit],
	);
	return (
		<>
			<PromptInput
				ref={bindRef}
				{...props}
				onSubmit={submit}
				commands={commands}
				dictation={dictation ?? composerDictation}
				mentionProviders={providers}
				onAttachmentClick={attachmentPreview.onAttachmentClick}
				localFiles={LOCAL_FILES}
			/>
			<div className={props.className}>
				<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11px] text-muted-foreground">
					<Button
						type="button"
						size="xs"
						variant="ghost"
						disabled={props.disabled || props.pending}
						onClick={() => input.current?.openFileDialog()}
					>
						<Paperclip className="size-3.5" />
						<Trans>Attach files</Trans>
					</Button>
					<Button
						type="button"
						size="xs"
						variant="ghost"
						disabled={props.disabled || props.pending || pasting}
						onClick={() => void pasteImage()}
					>
						<ClipboardPaste className="size-3.5" />
						<Trans>Paste attachment</Trans>
					</Button>
					<span className="min-w-0 flex-1">
						<Trans>Paste a screenshot or drag files here.</Trans>
					</span>
					{imageInput === true ? (
						<span className="flex items-center gap-1">
							<Image className="size-3" />
							<Trans>Images</Trans>
							<Check className="size-3 text-green-600" />
						</span>
					) : null}
					<span>
						<Trans>Files</Trans>
					</span>
				</div>
			</div>
			{attachmentPreview.overlay}
		</>
	);
}
