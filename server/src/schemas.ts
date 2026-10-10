import { z } from "zod";
import { config } from "./config";

export const textBodySchema = z.object({
  text: z.string().max(config.maxTextLength, "Text is too long"),
});

export type TextBody = z.infer<typeof textBodySchema>;
