import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    description: z.string(),
    tags: z.array(z.string()).optional(),
    kind: z.enum(["essay", "note", "log", "doc"]).optional(),
    draft: z.boolean().optional(),
    status: z.enum(["seed", "draft", "evergreen", "archive"]).optional(),
    updated: z.date().optional(),
  }),
});

export const collections = { blog };
