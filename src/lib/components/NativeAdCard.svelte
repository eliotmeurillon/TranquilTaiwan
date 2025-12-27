<script lang="ts">
	import * as Card from "$lib/components/ui/card";
	import Badge from "$lib/components/ui/badge/badge.svelte";
	import { Button } from "$lib/components/ui/button";
	
	type Props = {
		image: string;
		title: string;
		description: string;
	};

	let { image, title, description }: Props = $props();
</script>

<div class="group relative overflow-hidden rounded-2xl border border-emerald-100/50 bg-gradient-to-br from-emerald-50/50 to-white p-4 shadow-sm hover:shadow-md transition-all duration-300">
	<div class="flex items-center gap-4">
		<!-- Left: Image -->
		<img 
			src={image} 
			alt={title} 
			class="h-20 w-20 shrink-0 rounded-xl object-cover shadow-sm group-hover:scale-105 transition-transform duration-500" 
		/>
		
		<!-- Center: Content -->
		<div class="flex-1 min-w-0 py-1">
			<div class="flex items-center gap-2 mb-1">
				<Badge variant="outline" class="border-emerald-200 text-emerald-600 bg-emerald-50/50 text-[10px] h-5 px-1.5 font-medium">
					Partenaire
				</Badge>
			</div>
			<h3 class="text-base font-semibold text-emerald-950 truncate pr-2 leading-tight mb-1">
				{title}
			</h3>
			<p class="text-xs text-slate-500 line-clamp-2 leading-relaxed">
				{description}
			</p>
		</div>

		<!-- Right: Action -->
		<div class="shrink-0 self-center">
			<Button size="sm" variant="ghost" class="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100/50 rounded-xl px-2 h-9">
				Voir 
				<span class="ml-1 text-lg leading-none">›</span>
			</Button>
		</div>
	</div>
</div>
