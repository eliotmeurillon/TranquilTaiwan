<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getLocale } from '$lib/paraglide/runtime';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import * as m from '$lib/paraglide/messages';
	import * as Card from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { ArrowLeft, Database, FileText, RefreshCw, BarChart3, Shield } from "lucide-svelte";
	import { generateSEO } from '$lib/utils/seo';
</script>

{@const seoData = generateSEO(
	{
		title: m.sources_title(),
		description: m.sources_intro(),
		image: `${page.url.origin}/logo.png`
	},
	page
)}

<svelte:head>
	<!-- Primary Meta Tags -->
	<title>{seoData.title} - {m.app_title()}</title>
	<meta name="title" content="{seoData.title}" />
	<meta name="description" content={seoData.description} />
	<link rel="canonical" href={seoData.canonical} />
	<meta name="robots" content={seoData.robots} />

	<!-- Open Graph / Facebook -->
	<meta property="og:type" content={seoData.og.type} />
	<meta property="og:url" content={seoData.og.url} />
	<meta property="og:title" content={seoData.og.title} />
	<meta property="og:description" content={seoData.og.description} />
	<meta property="og:image" content={seoData.og.image} />
	<meta property="og:site_name" content={seoData.og.siteName} />

	<!-- Twitter -->
	<meta name="twitter:card" content={seoData.twitter.card} />
	<meta name="twitter:url" content={seoData.og.url} />
	<meta name="twitter:title" content={seoData.twitter.title} />
	<meta name="twitter:description" content={seoData.twitter.description} />
	<meta name="twitter:image" content={seoData.twitter.image} />

	<!-- LINE -->
	<meta property="line:image" content={seoData.line.image} />
	<meta property="line:description" content={seoData.line.description} />
</svelte:head>

<div class="min-h-screen bg-[#FAFAFA] relative font-sans text-[#1D1D1F]">
	<!-- Header -->
	<header class="fixed top-0 left-0 w-full z-50 p-4 flex justify-between items-center pointer-events-none">
		<div class="pointer-events-auto">
			<Button 
				variant="outline" 
				size="icon" 
				class="bg-[rgba(255,255,255,0.72)] backdrop-blur-xl shadow-sm hover:bg-[rgba(255,255,255,0.9)] rounded-full border border-[rgba(0,0,0,0.05)] w-[40px] h-[40px]"
				onclick={() => goto('/')}
				aria-label={m.nav_back()}
			>
				<ArrowLeft class="w-5 h-5 text-[#1D1D1F]" strokeWidth={2} />
			</Button>
		</div>
		<div class="pointer-events-auto">
			<LanguageSwitcher />
		</div>
	</header>

	<!-- Content -->
	<main class="pt-20 pb-32 px-4 max-w-4xl mx-auto space-y-8">
		<!-- Hero Section -->
		<div class="text-center space-y-4 mb-12">
			<div class="flex items-center justify-center gap-3 mb-4">
				<div class="w-12 h-12 rounded-full bg-[rgba(0,122,255,0.1)] text-[#007AFF] flex items-center justify-center">
					<Database class="w-6 h-6" strokeWidth={1.5} />
				</div>
				<h1 class="text-[34px] md:text-[48px] font-bold text-[#1D1D1F] leading-tight tracking-tight">
					{m.sources_title()}
				</h1>
			</div>
			<p class="text-[19px] leading-relaxed text-[#6E6E73] max-w-2xl mx-auto">
				{m.sources_intro()}
			</p>
		</div>

		<!-- Data Sources Card -->
		<Card.Root class="rounded-[18px] border border-[rgba(0,0,0,0.06)] shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-[30px] bg-[rgba(255,255,255,0.9)]">
			<Card.Header class="pb-4">
				<div class="flex items-center gap-3 mb-2">
					<div class="w-10 h-10 rounded-full bg-[rgba(0,122,255,0.1)] text-[#007AFF] flex items-center justify-center">
						<Database class="w-5 h-5" strokeWidth={1.5} />
					</div>
					<Card.Title class="text-[22px] font-bold text-[#1D1D1F] tracking-tight">
						{m.sources_data_title()}
					</Card.Title>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				<div class="p-4 rounded-[14px] bg-[#F5F5F7]/50 border border-[rgba(0,0,0,0.06)]">
					<h3 class="text-[19px] font-semibold text-[#1D1D1F] mb-2 flex items-center gap-2">
						<FileText class="w-5 h-5 text-[#007AFF]" strokeWidth={1.5} />
						{m.sources_data_taiwan_gov()}
					</h3>
					<p class="text-[17px] leading-relaxed text-[#6E6E73]">
						{m.sources_data_taiwan_gov_desc()}
					</p>
				</div>

				<div class="p-4 rounded-[14px] bg-[#F5F5F7]/50 border border-[rgba(0,0,0,0.06)]">
					<h3 class="text-[19px] font-semibold text-[#1D1D1F] mb-2 flex items-center gap-2">
						<Shield class="w-5 h-5 text-[#34C759]" strokeWidth={1.5} />
						{m.sources_data_license()}
					</h3>
					<p class="text-[17px] leading-relaxed text-[#6E6E73]">
						{m.sources_data_license_desc()}
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Methodology Card -->
		<Card.Root class="rounded-[18px] border border-[rgba(0,0,0,0.06)] shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-[30px] bg-[rgba(255,255,255,0.9)]">
			<Card.Header class="pb-4">
				<div class="flex items-center gap-3 mb-2">
					<div class="w-10 h-10 rounded-full bg-[rgba(52,199,89,0.1)] text-[#34C759] flex items-center justify-center">
						<BarChart3 class="w-5 h-5" strokeWidth={1.5} />
					</div>
					<Card.Title class="text-[22px] font-bold text-[#1D1D1F] tracking-tight">
						{m.sources_methodology_title()}
					</Card.Title>
				</div>
			</Card.Header>
			<Card.Content class="space-y-4">
				<p class="text-[17px] leading-relaxed text-[#6E6E73] mb-6">
					{m.sources_methodology_intro()}
				</p>

				<!-- Noise -->
				<div class="p-4 rounded-[14px] bg-[rgba(255,149,0,0.08)] border border-[rgba(255,149,0,0.2)]">
					<div class="flex items-start justify-between mb-2">
						<h3 class="text-[17px] font-semibold text-[#1D1D1F]">
							🔇 {m.noise_score()}
						</h3>
						<span class="text-[15px] font-bold text-[#FF9500]">25%</span>
					</div>
					<p class="text-[15px] leading-relaxed text-[#6E6E73]">
						{m.sources_methodology_noise()}
					</p>
				</div>

				<!-- Air Quality -->
				<div class="p-4 rounded-[14px] bg-[rgba(90,200,250,0.08)] border border-[rgba(90,200,250,0.2)]">
					<div class="flex items-start justify-between mb-2">
						<h3 class="text-[17px] font-semibold text-[#1D1D1F]">
							🌬️ {m.air_quality()}
						</h3>
						<span class="text-[15px] font-bold text-[#5AC8FA]">25%</span>
					</div>
					<p class="text-[15px] leading-relaxed text-[#6E6E73]">
						{m.sources_methodology_air()}
					</p>
				</div>

				<!-- Safety -->
				<div class="p-4 rounded-[14px] bg-[rgba(255,149,0,0.08)] border border-[rgba(255,149,0,0.2)]">
					<div class="flex items-start justify-between mb-2">
						<h3 class="text-[17px] font-semibold text-[#1D1D1F]">
							🛡️ {m.safety()}
						</h3>
						<span class="text-[15px] font-bold text-[#FF9500]">20%</span>
					</div>
					<p class="text-[15px] leading-relaxed text-[#6E6E73]">
						{m.sources_methodology_safety()}
					</p>
				</div>

				<!-- Convenience -->
				<div class="p-4 rounded-[14px] bg-[rgba(175,82,222,0.08)] border border-[rgba(175,82,222,0.2)]">
					<div class="flex items-start justify-between mb-2">
						<h3 class="text-[17px] font-semibold text-[#1D1D1F]">
							🚲 {m.convenience()}
						</h3>
						<span class="text-[15px] font-bold text-[#AF52DE]">15%</span>
					</div>
					<p class="text-[15px] leading-relaxed text-[#6E6E73]">
						{m.sources_methodology_convenience()}
					</p>
				</div>

				<!-- Zoning Risk -->
				<div class="p-4 rounded-[14px] bg-[rgba(255,59,48,0.08)] border border-[rgba(255,59,48,0.2)]">
					<div class="flex items-start justify-between mb-2">
						<h3 class="text-[17px] font-semibold text-[#1D1D1F]">
							🏭 {m.zoning_risk()}
						</h3>
						<span class="text-[15px] font-bold text-[#FF3B30]">15%</span>
					</div>
					<p class="text-[15px] leading-relaxed text-[#6E6E73]">
						{m.sources_methodology_zoning()}
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Data Updates Card -->
		<Card.Root class="rounded-[18px] border border-[rgba(0,0,0,0.06)] shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-[30px] bg-[rgba(255,255,255,0.9)]">
			<Card.Header class="pb-4">
				<div class="flex items-center gap-3 mb-2">
					<div class="w-10 h-10 rounded-full bg-[rgba(175,82,222,0.1)] text-[#AF52DE] flex items-center justify-center">
						<RefreshCw class="w-5 h-5" strokeWidth={1.5} />
					</div>
					<Card.Title class="text-[22px] font-bold text-[#1D1D1F] tracking-tight">
						{m.sources_update_title()}
					</Card.Title>
				</div>
			</Card.Header>
			<Card.Content>
				<p class="text-[17px] leading-relaxed text-[#6E6E73]">
					{m.sources_update_desc()}
				</p>
			</Card.Content>
		</Card.Root>
	</main>

	<!-- Footer -->
	<footer class="py-8 text-center text-[13px] text-[#86868B] space-x-6 border-t border-[rgba(0,0,0,0.08)] mt-16">
		<a href="/about" class="hover:text-[#1D1D1F] transition-colors">{m.landing_footer_about()}</a>
		<a href="/sources" class="hover:text-[#1D1D1F] transition-colors">{m.landing_footer_sources()}</a>
		<a href="/legal" class="hover:text-[#1D1D1F] transition-colors">{m.landing_footer_legal()}</a>
	</footer>
</div>

