<script lang="ts">
	import { DropdownMenu as BitsDropdownMenu } from "bits-ui";
	import { cn } from "$lib/utils";

	let { class: className, ...restProps } = $props();
</script>

<BitsDropdownMenu.Item
	class={cn(
		"relative flex cursor-default select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none transition-colors data-[disabled]:pointer-events-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:opacity-50",
		className
	)}
	{...restProps}
>
	{@render restProps.children?.()}
</BitsDropdownMenu.Item>

