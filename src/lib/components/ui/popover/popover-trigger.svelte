<script lang="ts">
	import { Popover as BitsPopover } from "bits-ui";

	let { ...restProps } = $props();
</script>

<BitsPopover.Trigger {...restProps}>
	{@render restProps.children?.()}
</BitsPopover.Trigger>

