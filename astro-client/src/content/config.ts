import { defineCollection } from "astro:content";
import { z } from "astro/zod";

const spriteVariant = z.object({
  default: z.string().nullable(),
  shiny: z.string().nullable().optional(),
});

const pokemon = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.number(),
    name: z.string(),
    types: z.array(z.string()),
    sprites: z.object({
      official: z.object({
        default: z.string().nullable(),
      }),
      home: z.object({
        default: z.string().nullable(),
        shiny: z.string().nullable(),
      }),
      default: z.object({
        default: z.string().nullable(),
        shiny: z.string().nullable(),
      }),
      showdown: z.object({
        default: z.string().nullable(),
        shiny: z.string().nullable(),
      }),
      variants: z.record(z.string(), spriteVariant),
    }),
    description: z.string(),
    abilities: z.array(z.object({
      name: z.string(),
      description: z.string(),
    })),
  }),
});

export const collections = { pokemon };
