<script lang="ts">
  import { CLIENT } from "$lib/client";
  import { TEXT, getClientLinks } from "$lib/pokedex";

  /** Links to the same page in every other client. */
  let { path }: { path: string } = $props();
</script>

<nav aria-label="Clients" class="pd-client-nav">
  <span class="pd-client-nav__label">{TEXT.clientNavLabel}</span>
  {#each getClientLinks(CLIENT, path) as link (link.client)}
    <a
      href={link.href}
      aria-current={link.current ? "page" : undefined}
      class="pd-btn pd-btn--sm {link.current ? 'pd-btn--primary' : 'pd-btn--outline'}"
      data-sveltekit-reload
    >
      {link.label}
    </a>
  {/each}
</nav>
