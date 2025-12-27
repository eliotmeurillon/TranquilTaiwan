<script lang="ts">
	import { cn } from "$lib/utils";
	let { class: className = undefined, children, ...restProps } = $props();
</script>

<div class={cn("rounded-2xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all duration-300", className)} {...restProps}>
	{@render children?.()}
</div>
