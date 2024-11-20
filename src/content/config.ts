import { z, defineCollection } from "astro:content";

export const blogSchema = (image: () => any) =>
  z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.string().optional(),
    heroImage: image().refine((img) => img.width >= 10, {
      message: "Cover image must be at least 10 pixels wide!",
    }),
    badge: z.string().optional(),
    tags: z
      .array(z.string())
      .refine((items) => new Set(items).size === items.length, {
        message: "tags must be unique",
      })
      .optional(),
  });

// This part is complicated because of the usage of image()
export const projectsSchema = (image: () => any) =>
  z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.string().optional(),
    heroImage: image().refine((img) => img.width >= 10, {
      message: "Cover image must be at least 10 pixels wide!",
    }),
    badge: z.string().optional(),
    tags: z
      .array(z.string())
      .refine((items) => new Set(items).size === items.length, {
        message: "tags must be unique",
      })
      .optional(),
  });

export type BlogSchema = z.infer<ReturnType<typeof blogSchema>>;
export type ProjectsSchema = z.infer<ReturnType<typeof projectsSchema>>;

const blogCollection = defineCollection({
  schema: ({ image }) => blogSchema(image),
});
const projectsCollection = defineCollection({
  schema: ({ image }) => projectsSchema(image),
});

export const collections = {
  blog: blogCollection,
  projects: projectsCollection,
};
