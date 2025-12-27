<script lang="ts">
	import { Separator as BitsSeparator } from "bits-ui";
	import { cn } from "$lib/utils";

	let { class: className, orientation = "horizontal", decorative = true, ...restProps } = $props();
</script>

<BitsSeparator.Root
	class={cn(
		"shrink-0 bg-border",
		orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
		className
	)}
	{decorative}
	orientation={orientation as "horizontal" | "vertical"}
	{...restProps}
/>
