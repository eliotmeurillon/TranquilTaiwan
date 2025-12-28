<script lang="ts">
	import { DropdownMenu as BitsDropdownMenu } from "bits-ui";
	import { cn } from "$lib/utils";

	let { class: className, ...restProps } = $props();
</script>

<BitsDropdownMenu.Item
	class={cn(
		"relative flex cursor-default select-none items-center rounded-[10px] px-3 py-2 text-[15px] outline-none transition-all duration-200 data-[disabled]:pointer-events-none data-[highlighted]:bg-[rgba(0,122,255,0.08)] data-[highlighted]:text-[#007AFF] data-[disabled]:opacity-50",
		className
	)}
	{...restProps}
>
	{@render restProps.children?.()}
</BitsDropdownMenu.Item>
