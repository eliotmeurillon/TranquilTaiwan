<script lang="ts">
	import { Progress as BitsProgress } from "bits-ui";
	import { cn } from "$lib/utils";

	let { class: className, value = 0, ...restProps } = $props();
</script>

<BitsProgress.Root
	class={cn(
		"relative h-1.5 w-full overflow-hidden rounded-full bg-[rgba(120,120,128,0.16)]",
		className
	)}
	{...restProps}
	{value}
>
	<div
		class="h-full w-full flex-1 bg-[#007AFF] transition-all duration-500 ease-out"
		style={`transform: translateX(-${100 - (value || 0)}%)`}
	></div>
</BitsProgress.Root>
