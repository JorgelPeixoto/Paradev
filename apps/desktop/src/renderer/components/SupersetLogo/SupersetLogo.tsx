import { cn } from "@superset/ui/utils";
import peixotoMark from "renderer/assets/peixoto-mark.png";

interface SupersetLogoProps {
	className?: string;
	gradient?: boolean;
}

export function SupersetLogo({ className }: SupersetLogoProps) {
	return (
		<div className={cn("inline-flex h-8 items-center gap-3 text-foreground", className)}>
			<img src={peixotoMark} alt="" className="h-full w-auto rounded-lg bg-white" />
			<span className="font-semibold tracking-tight">Peixoto Soluções</span>
		</div>
	);
}
