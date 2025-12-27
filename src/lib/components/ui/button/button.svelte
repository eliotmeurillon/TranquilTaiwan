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
		default: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
		destructive: "bg-orange-600 text-white hover:bg-orange-700 shadow-sm",
		outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
		secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
		ghost: "hover:bg-accent hover:text-accent-foreground",
		link: "text-primary underline-offset-4 hover:underline",
	};

	const sizes = {
		default: "h-10 px-4 py-2",
		sm: "h-9 rounded-2xl px-3",
		lg: "h-11 rounded-2xl px-8",
		icon: "h-10 w-10",
	};

	let variantClass = $derived(variants[variant as keyof typeof variants] || variants.default);
	let sizeClass = $derived(sizes[size as keyof typeof sizes] || sizes.default);
</script>

{#if href}
	<a
		{href}
		class={cn(
			"inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
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
			"inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
			variantClass,
			sizeClass,
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</BitsButton.Root>
{/if}
