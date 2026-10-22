import { z } from "zod";

const text = z.string().trim().min(1).max(500);
const resource = z.string().min(1).max(64);
const condition = z.object({
  resource,
  minCount: z.number().int().min(0).max(10_000).optional(),
}).strict();

export const extractionSchema = z.object({
  plan: z.object({ title: text, triggerMessageId: z.string().min(1).max(128) }).strict().nullable(),
  commitments: z.array(z.object({
    personId: z.string().min(1).max(128),
    offers: resource,
    requires: z.array(condition).max(20),
    quote: z.string().min(1).max(2_000),
  }).strict()).max(40),
  requiredForPlan: z.array(resource).max(20),
}).strict();

export const explanationSchema = z.object({ explanation: text }).strict();

export const bookingSchema = z.object({
  event: z.object({
    title: text, when: text, where: text,
    agenda: z.array(text).length(4),
    blurb: z.string().min(1).max(1_000),
  }).strict(),
  invites: z.array(z.object({ personId: z.string().min(1).max(128), text }).strict()).max(200),
  callScript: z.string().trim().min(1).max(1_000),
}).strict();

export type Extraction = z.infer<typeof extractionSchema>;
