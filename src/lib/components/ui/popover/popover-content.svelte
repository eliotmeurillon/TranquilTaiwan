<script lang="ts">
	import { Popover as BitsPopover } from "bits-ui";
	import { cn } from "$lib/utils";

	type AlignType = "end" | "start" | "center" | undefined;
	let { class: className, align = "center" as AlignType, sideOffset = 4, ...restProps } = $props();
</script>

<BitsPopover.Content
	align={align}
	{sideOffset}
	class={cn(
		"z-50 w-72 rounded-[14px] border border-[rgba(0,0,0,0.08)] bg-[rgba(255,255,255,0.94)] backdrop-blur-[40px] p-4 text-[#1D1D1F] shadow-[0_16px_48px_rgba(0,0,0,0.14)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
		className
	)}
	{...restProps}
>
	{@render restProps.children?.()}
</BitsPopover.Content>
