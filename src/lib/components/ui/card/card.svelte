<script lang="ts">
	import { cn } from "$lib/utils";
	let { class: className = undefined, children, ...restProps } = $props();
</script>

<div 
	class={cn(
		"rounded-[18px] border border-black/5 bg-white/90 text-[#1D1D1F] shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.12)] hover:-translate-y-[2px] backdrop-blur-[30px] transition-all duration-400 ease-[cubic-bezier(0.32,0.72,0,1)]", 
		className
	)} 
	{...restProps}
>
	{@render children?.()}
</div>
