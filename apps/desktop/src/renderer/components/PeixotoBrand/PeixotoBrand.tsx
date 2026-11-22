import { cn } from "@superset/ui/utils";
import mark from "renderer/assets/peixoto-mark.png";
export function PeixotoBrand({ className }: { className?: string }) {
	return (
		<div className={cn("flex items-center justify-center gap-3", className)}>
			<img src={mark} alt="" className="size-12 rounded-xl bg-white" />
			<span className="text-xl font-semibold tracking-tight text-foreground">
				Peixoto Soluções
			</span>
		</div>
	);
}
