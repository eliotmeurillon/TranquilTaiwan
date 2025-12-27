<script lang="ts">
	import { DropdownMenu as BitsDropdownMenu } from "bits-ui";
	import { cn } from "$lib/utils";

	let { class: className, ...restProps } = $props();
</script>

<BitsDropdownMenu.Trigger class={cn(className)} {...restProps} />

