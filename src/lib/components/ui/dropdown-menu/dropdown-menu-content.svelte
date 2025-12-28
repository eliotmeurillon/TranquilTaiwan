<script lang="ts">
	import { DropdownMenu as BitsDropdownMenu } from "bits-ui";
	import { cn } from "$lib/utils";
	import { fly } from "svelte/transition";

	let { class: className, children, ...restProps } = $props();
</script>

<BitsDropdownMenu.Content
	forceMount
	class={cn(
		"z-50 min-w-[8rem] overflow-hidden rounded-[14px] border border-[rgba(0,0,0,0.08)] bg-[rgba(255,255,255,0.94)] backdrop-blur-[40px] p-2 text-[#1D1D1F] shadow-[0_16px_48px_rgba(0,0,0,0.14)] outline-none",
		className
	)}
	{...restProps}
>
	{#snippet child({ wrapperProps, props, open })}
		{#if open}
			<div {...wrapperProps}>
				<div {...props} transition:fly={{ duration: 200, y: -5 }}>
					{@render children?.()}
				</div>
			</div>
		{/if}
	{/snippet}
</BitsDropdownMenu.Content>
