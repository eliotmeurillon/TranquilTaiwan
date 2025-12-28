<script lang="ts">
	import { Button as BitsButton } from "bits-ui";
	import { cn } from "$lib/utils";

	let {
		class: className,
		variant = "default",
		size = "default",
		children,
		href = undefined,
		...restProps
	} = $props();

	const variants = {
		default: "bg-[#007AFF] text-white hover:scale-[1.02] active:scale-[0.98] shadow-sm backdrop-blur-md",
		destructive: "bg-[#FF3B30] text-white hover:scale-[1.02] active:scale-[0.98] shadow-sm",
		outline: "border border-[rgba(0,0,0,0.1)] bg-white/80 backdrop-blur-xl hover:bg-white text-[#1D1D1F]",
		secondary: "bg-[rgba(0,122,255,0.1)] text-[#007AFF] backdrop-blur-xl border border-[rgba(0,122,255,0.2)] hover:bg-[rgba(0,122,255,0.15)]",
		ghost: "hover:bg-[rgba(0,122,255,0.08)] text-[#007AFF] backdrop-blur-md",
		link: "text-[#007AFF] underline-offset-4 hover:underline",
	};

	const sizes = {
		default: "h-[40px] px-6 text-[15px]",
		sm: "h-[32px] px-4 text-[13px]",
		lg: "h-[44px] px-8 text-[17px]",
		icon: "h-[40px] w-[40px] p-0",
	};

	let variantClass = $derived(variants[variant as keyof typeof variants] || variants.default);
	let sizeClass = $derived(sizes[size as keyof typeof sizes] || sizes.default);
	
	const commonClasses = "inline-flex items-center justify-center whitespace-nowrap rounded-full font-semibold tracking-tight transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 disabled:grayscale";
</script>

{#if href}
	<a
		{href}
		class={cn(
			commonClasses,
			variantClass,
			sizeClass,
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<BitsButton.Root
		class={cn(
			commonClasses,
			variantClass,
			sizeClass,
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</BitsButton.Root>
{/if}
