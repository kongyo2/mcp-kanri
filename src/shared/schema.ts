import { z } from 'zod';

const NameSchema = z
  .string()
  .min(1, 'validation.nameRequired')
  .max(64, 'validation.nameMaxLength')
  .regex(/^[A-Za-z0-9_-]+$/, 'validation.namePattern');

const KeyValueRecord = z.record(z.string(), z.string());

const serverHeadFields = {
  id: z.string(),
  name: NameSchema,
  description: z.string().optional().default(''),
};
const serverTailFields = {
  scope: z.enum(['local', 'project', 'user']).default('user'),
  createdAt: z.number(),
  updatedAt: z.number(),
};

const StdioServerSchema = z.object({
  ...serverHeadFields,
  transport: z.literal('stdio'),
  command: z.string().min(1, 'validation.commandRequired'),
  args: z.array(z.string()).default([]),
  env: KeyValueRecord.default({}),
  ...serverTailFields,
});

function remoteServerSchema<T extends 'http' | 'sse'>(transport: T) {
  return z.object({
    ...serverHeadFields,
    transport: z.literal(transport),
    url: z.string().url('validation.urlInvalid'),
    headers: KeyValueRecord.default({}),
    ...serverTailFields,
  });
}

const HttpServerSchema = remoteServerSchema('http');

const SseServerSchema = remoteServerSchema('sse');

export const McpServerSchema = z.discriminatedUnion('transport', [
  StdioServerSchema,
  HttpServerSchema,
  SseServerSchema,
]);

export type McpServer = z.infer<typeof McpServerSchema>;
export type Transport = McpServer['transport'];
export type Scope = McpServer['scope'];

const INPUT_OMIT = { id: true, createdAt: true, updatedAt: true } as const;

export const McpServerInputSchema = z.discriminatedUnion('transport', [
  StdioServerSchema.omit(INPUT_OMIT),
  HttpServerSchema.omit(INPUT_OMIT),
  SseServerSchema.omit(INPUT_OMIT),
]);
export type McpServerInput = z.infer<typeof McpServerInputSchema>;

export const StoreFileSchema = z.object({
  version: z.literal(1),
  servers: z.array(McpServerSchema).default([]),
});
export type StoreFile = z.infer<typeof StoreFileSchema>;
