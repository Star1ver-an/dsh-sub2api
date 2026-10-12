import { z } from 'zod'

const name = '@dsh-local/sub2api'
export const serviceUrl = z.string().max(2048).refine(value => {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash
  } catch {
    return false
  }
}, 'Use an HTTP(S) service URL without credentials, query or fragment')

export const statusSchema = z.object({
  url: serviceUrl,
  embedUrl: serviceUrl,
  healthy: z.boolean(),
  running: z.boolean(),
  message: z.string(),
})
export type Sub2ApiStatus = z.infer<typeof statusSchema>

const declarations = [
  ['endpoint', [], serviceUrl],
  ['configure', [['url', serviceUrl]], serviceUrl],
  ['status', [], statusSchema],
  ['start', [], statusSchema],
  ['stop', [], statusSchema],
]
const descriptors = declarations.map(([method, parameters, result]) => ({
  id: `${name}#sub2ApiBridge/${method}`,
  service: 'sub2ApiBridge',
  namespace: 'sub2ApiBridge',
  method,
  invocation: { kind: 'direct' },
  parameters: parameters.map(([parameter, schema]) => ({
    name: parameter,
    wire: parameter,
    source: 'json',
    codec: { mode: 'strict', typeSymbol: `${name}#${method}:${parameter}`, create: () => schema },
  })),
  cancellation: { parameter: 'signal' },
  result: { mode: 'strict', typeSymbol: `${name}#${method}:result`, create: () => result },
}))

export const TYPERT = { package: name, face: 'host', schemas: [], invocations: descriptors, model: { services: [], events: [], objects: [] } }
export const TYPERT_REMOTE = { package: name, descriptors }
