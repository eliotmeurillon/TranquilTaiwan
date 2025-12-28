<script lang="ts">
	import { cn } from "$lib/utils";
	let {
		class: className,
		variant = "default",
		children,
		...restProps
	} = $props();

	const variants = {
		default: "bg-[#007AFF] text-white hover:bg-[#007AFF]/90",
		secondary: "bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#F5F5F7]/80",
		destructive: "bg-[#FF3B30] text-white hover:bg-[#FF3B30]/90",
		outline: "text-[#1D1D1F] border border-black/10",
		success: "bg-[#34C759] text-white",
		warning: "bg-[#FF9500] text-white",
	};

	let variantClass = $derived(variants[variant as keyof typeof variants] || variants.default);
</script>

<div
	class={cn(
		"inline-flex items-center rounded-full border border-transparent px-3 py-1 text-[13px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2",
		variantClass,
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
