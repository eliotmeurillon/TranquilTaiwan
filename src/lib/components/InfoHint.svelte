<script lang="ts">
  import * as Popover from "$lib/components/ui/popover";
  import { HelpCircle } from "lucide-svelte";
  
  let { title, description } = $props();
</script>

<Popover.Root>
  <Popover.Trigger 
    asChild
    class="z-50"
  >
    {#snippet child(builder)}
      <button
        {...builder}
        type="button"
        class="inline-flex items-center justify-center z-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:ring-offset-2 rounded-full"
        aria-label="Show information"
      >
        <HelpCircle class="w-4 h-4 text-[#86868B] hover:text-[#007AFF] transition-colors z-50 cursor-pointer" />
        <span class="sr-only">Info</span>
      </button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="z-50">
    <div class="space-y-2">
      <h4 class="font-medium leading-none text-[#1D1D1F]">{title}</h4>
      <p class="text-sm text-[#6E6E73]">
        {description}
      </p>
    </div>
  </Popover.Content>
</Popover.Root>
