<script lang="ts">
	import { cn } from "$lib/utils";
	let {
		class: className,
		variant = "default",
		children,
		...restProps
	} = $props();

	const variants = {
		default: "border-transparent bg-emerald-600 text-white hover:bg-emerald-600/80",
		secondary: "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80",
		destructive: "border-transparent bg-orange-600 text-white hover:bg-orange-600/80",
		outline: "text-foreground",
	};

	let variantClass = $derived(variants[variant as keyof typeof variants] || variants.default);
</script>

<div
	class={cn(
		"inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
		variantClass,
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
