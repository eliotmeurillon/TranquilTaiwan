<script lang="ts">
	import { Progress as BitsProgress } from "bits-ui";
	import { cn } from "$lib/utils";

	let { class: className, value = 0, ...restProps } = $props();
</script>

<BitsProgress.Root
	class={cn(
		"relative h-3 w-full overflow-hidden rounded-full bg-slate-100",
		className
	)}
	{...restProps}
	{value}
>
	<div
		class="h-full w-full flex-1 bg-emerald-600 transition-all"
		style={`transform: translateX(-${100 - (value || 0)}%)`}
	></div>
</BitsProgress.Root>

