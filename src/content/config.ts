import { z, defineCollection, reference } from 'astro:content';

const recipesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tags: z.array(z.string()),
    created: z.string(),
    modified: z.string()
  }),
});

const menusCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    recipes: z.array(reference('recipes')) // Array of recipe slugs
  })
});

const updatesCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    tags: z.array(z.string()),
    created: z.string(),
    modified: z.string()
  }),
});

export const collections = {
  'recipes': recipesCollection,
  'menus': menusCollection,
  'updates': updatesCollection
};