import { defineCollection, z } from "astro:content";

const pokemon = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.number(),
    name: z.string(),
    types: z.array(z.string()),
    sprite: z.string().url(),
    description: z.string(),
    abilities: z.array(z.string()),
  })
});

export const collections = { pokemon };
