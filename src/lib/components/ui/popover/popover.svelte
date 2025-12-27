<script lang="ts">
	import { Popover as BitsPopover } from "bits-ui";

	let { open = $bindable(false), ...restProps } = $props();
</script>

<BitsPopover.Root bind:open {...restProps}>
	{@render restProps.children?.()}
</BitsPopover.Root>

