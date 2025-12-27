<script lang="ts">
  import * as Popover from "$lib/components/ui/popover";
  import { HelpCircle } from "lucide-svelte";
  
  let { title, description } = $props();
</script>

<Popover.Root>
  <Popover.Trigger class="inline-flex items-center justify-center">
    <HelpCircle class="w-4 h-4 text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer" />
    <span class="sr-only">Info</span>
  </Popover.Trigger>
  <Popover.Content>
    <div class="space-y-2">
      <h4 class="font-medium leading-none text-slate-900">{title}</h4>
      <p class="text-sm text-slate-500">
        {description}
      </p>
    </div>
  </Popover.Content>
</Popover.Root>

