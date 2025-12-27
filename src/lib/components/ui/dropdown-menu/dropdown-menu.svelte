<script lang="ts">
	import { DropdownMenu as BitsDropdownMenu } from "bits-ui";

	let { ...restProps } = $props();
</script>

<BitsDropdownMenu.Root {...restProps}>
	{@render restProps.children?.()}
</BitsDropdownMenu.Root>

