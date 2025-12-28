<script lang="ts">
	import { Separator as BitsSeparator } from "bits-ui";
	import { cn } from "$lib/utils";

	let { class: className, orientation = "horizontal", decorative = true, ...restProps } = $props();
</script>

<BitsSeparator.Root
	class={cn(
		"shrink-0 bg-[rgba(0,0,0,0.08)]",
		orientation === "horizontal" ? "h-[0.5px] w-full" : "h-full w-[0.5px]",
		className
	)}
	{decorative}
	orientation={orientation as "horizontal" | "vertical"}
	{...restProps}
/>
