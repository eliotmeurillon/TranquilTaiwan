<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getLocale } from '$lib/paraglide/runtime';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import * as m from '$lib/paraglide/messages';
	import * as Card from "$lib/components/ui/card";
	import { Button } from "$lib/components/ui/button";
	import { ArrowLeft, Shield, FileText, Scale, Mail } from "lucide-svelte";
	import { generateSEO } from '$lib/utils/seo';
</script>

{@const seoData = generateSEO(
	{
		title: m.legal_title(),
		description: m.legal_privacy_intro(),
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
					<Scale class="w-6 h-6" strokeWidth={1.5} />
				</div>
				<h1 class="text-[34px] md:text-[48px] font-bold text-[#1D1D1F] leading-tight tracking-tight">
					{m.legal_title()}
				</h1>
			</div>
		</div>

		<!-- Privacy Policy Card -->
		<Card.Root class="rounded-[18px] border border-[rgba(0,0,0,0.06)] shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-[30px] bg-[rgba(255,255,255,0.9)]">
			<Card.Header class="pb-4">
				<div class="flex items-center gap-3 mb-2">
					<div class="w-10 h-10 rounded-full bg-[rgba(0,122,255,0.1)] text-[#007AFF] flex items-center justify-center">
						<Shield class="w-5 h-5" strokeWidth={1.5} />
					</div>
					<Card.Title class="text-[22px] font-bold text-[#1D1D1F] tracking-tight">
						{m.legal_privacy_title()}
					</Card.Title>
				</div>
			</Card.Header>
			<Card.Content class="space-y-6">
				<p class="text-[17px] leading-relaxed text-[#6E6E73]">
					{m.legal_privacy_intro()}
				</p>

				<div class="pt-4 border-t border-[rgba(0,0,0,0.08)]">
					<h3 class="text-[19px] font-semibold text-[#1D1D1F] mb-2">
						{m.legal_privacy_data()}
					</h3>
					<p class="text-[17px] leading-relaxed text-[#6E6E73]">
						{m.legal_privacy_data_desc()}
					</p>
				</div>

				<div class="pt-4 border-t border-[rgba(0,0,0,0.08)]">
					<h3 class="text-[19px] font-semibold text-[#1D1D1F] mb-2">
						{m.legal_privacy_cookies()}
					</h3>
					<p class="text-[17px] leading-relaxed text-[#6E6E73]">
						{m.legal_privacy_cookies_desc()}
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Terms of Service Card -->
		<Card.Root class="rounded-[18px] border border-[rgba(0,0,0,0.06)] shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-[30px] bg-[rgba(255,255,255,0.9)]">
			<Card.Header class="pb-4">
				<div class="flex items-center gap-3 mb-2">
					<div class="w-10 h-10 rounded-full bg-[rgba(52,199,89,0.1)] text-[#34C759] flex items-center justify-center">
						<FileText class="w-5 h-5" strokeWidth={1.5} />
					</div>
					<Card.Title class="text-[22px] font-bold text-[#1D1D1F] tracking-tight">
						{m.legal_terms_title()}
					</Card.Title>
				</div>
			</Card.Header>
			<Card.Content class="space-y-6">
				<p class="text-[17px] leading-relaxed text-[#6E6E73]">
					{m.legal_terms_intro()}
				</p>

				<div class="p-4 rounded-[14px] bg-[#F5F5F7]/50 border border-[rgba(0,0,0,0.06)]">
					<h3 class="text-[19px] font-semibold text-[#1D1D1F] mb-2">
						{m.legal_terms_use()}
					</h3>
					<p class="text-[17px] leading-relaxed text-[#6E6E73]">
						{m.legal_terms_use_desc()}
					</p>
				</div>

				<div class="p-4 rounded-[14px] bg-[#F5F5F7]/50 border border-[rgba(0,0,0,0.06)]">
					<h3 class="text-[19px] font-semibold text-[#1D1D1F] mb-2">
						{m.legal_terms_liability()}
					</h3>
					<p class="text-[17px] leading-relaxed text-[#6E6E73]">
						{m.legal_terms_liability_desc()}
					</p>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Data License Card -->
		<Card.Root class="rounded-[18px] border border-[rgba(0,0,0,0.06)] shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-[30px] bg-[rgba(255,255,255,0.9)]">
			<Card.Header class="pb-4">
				<div class="flex items-center gap-3 mb-2">
					<div class="w-10 h-10 rounded-full bg-[rgba(175,82,222,0.1)] text-[#AF52DE] flex items-center justify-center">
						<FileText class="w-5 h-5" strokeWidth={1.5} />
					</div>
					<Card.Title class="text-[22px] font-bold text-[#1D1D1F] tracking-tight">
						{m.legal_license_title()}
					</Card.Title>
				</div>
			</Card.Header>
			<Card.Content>
				<p class="text-[17px] leading-relaxed text-[#6E6E73]">
					{m.legal_license_desc()}
				</p>
			</Card.Content>
		</Card.Root>

		<!-- Contact Card -->
		<Card.Root class="rounded-[18px] border border-[rgba(0,0,0,0.06)] shadow-[0_2px_8px_rgba(0,0,0,0.04)] backdrop-blur-[30px] bg-[rgba(255,255,255,0.9)]">
			<Card.Header class="pb-4">
				<div class="flex items-center gap-3 mb-2">
					<div class="w-10 h-10 rounded-full bg-[rgba(255,149,0,0.1)] text-[#FF9500] flex items-center justify-center">
						<Mail class="w-5 h-5" strokeWidth={1.5} />
					</div>
					<Card.Title class="text-[22px] font-bold text-[#1D1D1F] tracking-tight">
						{m.legal_contact_title()}
					</Card.Title>
				</div>
			</Card.Header>
			<Card.Content>
				<p class="text-[17px] leading-relaxed text-[#6E6E73]">
					{m.legal_contact_desc()}
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

