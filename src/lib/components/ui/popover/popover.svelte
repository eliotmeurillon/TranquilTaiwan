<script lang="ts">
	import { Popover as BitsPopover } from "bits-ui";

	let { ...restProps } = $props();
</script>

<BitsPopover.Root {...restProps}>
	{@render restProps.children?.()}
</BitsPopover.Root>

