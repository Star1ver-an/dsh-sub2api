import { z } from 'zod'

export const configSchema = z.object({
  url: z.string().url().default('http://127.0.0.1:8080'),
  requestTimeoutMs: z.number().int().min(1000).max(30000).default(5000),
  autoStart: z.boolean().default(false),
  binaryPath: z.string().max(4096).default(''),
  workingDirectory: z.string().max(4096).default(''),
  dataDirectory: z.string().max(4096).default(''),
  port: z.number().int().min(1024).max(65535).default(8080),
  args: z.array(z.string().max(4096)).max(32).default([]),
})
export type Sub2ApiConfig = z.infer<typeof configSchema>
