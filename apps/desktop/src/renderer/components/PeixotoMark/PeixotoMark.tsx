import { cn } from "@superset/ui/utils";
import mark from "renderer/assets/peixoto-mark.png";
export function PeixotoMark({
	className,
}: {
	className?: string;
	strokeWidth?: number;
}) {
	return (
		<img
			src={mark}
			alt="Peixoto Soluções"
			className={cn("rounded-md bg-white", className)}
		/>
	);
}
