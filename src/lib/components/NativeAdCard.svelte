<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import Badge from "$lib/components/ui/badge/badge.svelte";
	import { Button } from "$lib/components/ui/button";
	import * as m from '$lib/paraglide/messages';
	
	type Props = {
		image: string;
		title: string;
		description: string;
	};

	let { image, title, description }: Props = $props();
</script>

<Card.Root class="group relative overflow-hidden bg-gradient-to-br from-[rgba(52,199,89,0.05)] to-white/90 border-emerald-100/50">
	<div class="flex items-center gap-4 p-4">
		<!-- Left: Image -->
		<img 
			src={image} 
			alt={title} 
			class="h-20 w-20 shrink-0 rounded-[14px] object-cover shadow-sm group-hover:scale-105 transition-transform duration-500" 
		/>
		
		<!-- Center: Content -->
		<div class="flex-1 min-w-0 py-1">
			<div class="flex items-center gap-2 mb-1">
				<Badge variant="outline" class="border-[#34C759]/30 text-[#34C759] bg-[#34C759]/10 text-[10px] h-5 px-1.5 font-medium">
					{m.ad_partner()}
				</Badge>
			</div>
			<h3 class="text-base font-semibold text-[#1D1D1F] truncate pr-2 leading-tight mb-1">
				{title}
			</h3>
			<p class="text-xs text-[#86868B] line-clamp-2 leading-relaxed">
				{description}
			</p>
		</div>

		<!-- Right: Action -->
		<div class="shrink-0 self-center">
			<Button size="sm" variant="ghost" class="text-[#34C759] hover:text-[#34C759] hover:bg-[#34C759]/10 rounded-full px-2 h-9">
				{m.ad_view()} 
				<span class="ml-1 text-lg leading-none">›</span>
			</Button>
		</div>
	</div>
</Card.Root>
