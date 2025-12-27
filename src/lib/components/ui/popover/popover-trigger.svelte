<script lang="ts">
	import { Popover as BitsPopover } from "bits-ui";

	let { children, ...restProps } = $props();
</script>

<BitsPopover.Trigger {...restProps}>
	{#snippet child(props)}
		{@render children?.()}
	{/snippet}
</BitsPopover.Trigger>

