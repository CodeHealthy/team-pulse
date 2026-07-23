import { z } from "zod";

const id = z.string().regex(/^[a-f\d]{24}$/i);

export const workspaceOnlySchema = z.object({
    body: z.object({}),
    params: z.object({
        workspaceId: id,
    }),
    query: z.object({}),
});
