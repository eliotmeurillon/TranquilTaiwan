<script lang="ts">
	import { cn } from "$lib/utils";
	let { class: className = undefined, children, ...restProps } = $props();
</script>

<div class={cn("flex items-center p-6 pt-0", className)} {...restProps}>
	{@render children?.()}
</div>
