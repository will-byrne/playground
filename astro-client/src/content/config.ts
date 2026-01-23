import { defineCollection } from "astro:content";
import { z } from "astro/zod";

const pokemon = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.number(),
    name: z.string(),
    types: z.array(z.string()),
    sprites: z.any(),
    description: z.string(),
    abilities: z.array(z.object({
      name: z.string(),
      description: z.string(),
    })),
  }),
});

export const collections = { pokemon };
