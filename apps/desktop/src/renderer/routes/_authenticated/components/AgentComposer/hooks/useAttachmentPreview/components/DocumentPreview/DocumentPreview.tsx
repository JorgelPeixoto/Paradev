import { Trans, useLingui } from "@lingui/react/macro";
import type { PromptInputAttachment } from "@superset/chat-ui/PromptInput";
import { attachmentMediaType } from "@superset/shared/attachment-media-type";
import { Button } from "@superset/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@superset/ui/dialog";
import { useEffect, useState } from "react";
import { electronTrpcClient } from "renderer/lib/trpc-client";

export function DocumentPreview({
	attachment,
	onClose,
}: {
	attachment: PromptInputAttachment;
	onClose: () => void;
}) {
	const { t } = useLingui(),
		file = attachment.file,
		mime = attachmentMediaType(file);
	const [text, setText] = useState<string | null>(null),
		[url, setUrl] = useState<string | null>(null),
		[error, setError] = useState(false);
	const textFile =
		mime.startsWith("text/") ||
		mime === "application/json" ||
		/\.(log|xml|toml|sh|sql|rs|go|jsx)$/i.test(file.name);
	useEffect(() => {
		let active = true;
		let localUrl: string | undefined;
		if (textFile)
			void file
				.slice(0, 200000)
				.text()
				.then((value) => {
					if (active) setText(value);
				})
				.catch(() => {
					if (active) setError(true);
				});
		else if (mime === "application/pdf" || mime.startsWith("video/")) {
			localUrl = URL.createObjectURL(new Blob([file], { type: mime }));
			setUrl(localUrl);
		}
		return () => {
			active = false;
			if (localUrl) URL.revokeObjectURL(localUrl);
		};
	}, [file, mime, textFile]);
	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent
				className="max-h-[85vh] sm:max-w-3xl"
				aria-describedby={undefined}
			>
				<DialogHeader>
					<DialogTitle>{file.name}</DialogTitle>
				</DialogHeader>
				<div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
					<span>
						{mime} · {(file.size / 1024).toFixed(1)} KB
					</span>
					{attachment.sourcePath ? (
						<Button
							type="button"
							variant="ghost"
							size="xs"
							onClick={() =>
								void electronTrpcClient.external.openInFinder.mutate(
									attachment.sourcePath!,
								)
							}
						>
							<Trans>Show in folder</Trans>
						</Button>
					) : null}
				</div>
				{textFile ? (
					<pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/30 p-3 text-xs">
						{error
							? t({ message: "Couldn't attach files" })
							: (text ?? t({ message: "Loading..." }))}
					</pre>
				) : url && mime === "application/pdf" ? (
					<iframe
						src={url}
						title={file.name}
						className="h-[60vh] w-full rounded-md border"
					/>
				) : url && mime.startsWith("video/") ? (
					<video src={url} controls className="max-h-[60vh] w-full" />
				) : null}
			</DialogContent>
		</Dialog>
	);
}
