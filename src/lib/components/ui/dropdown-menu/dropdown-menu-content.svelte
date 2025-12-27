<script lang="ts">
	import { DropdownMenu as BitsDropdownMenu } from "bits-ui";
	import { cn } from "$lib/utils";
	import { fly } from "svelte/transition";

	let { class: className, children, ...restProps } = $props();
</script>

<BitsDropdownMenu.Content
	forceMount
	class={cn(
		"z-50 min-w-[8rem] overflow-hidden rounded-xl border bg-popover p-1 text-popover-foreground shadow-md outline-none",
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

