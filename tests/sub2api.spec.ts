import { createServer, type Server } from 'node:http'
import { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { Sub2ApiBridge } from '../src/index.ts'
import { serviceUrl, statusSchema, TYPERT_REMOTE } from '../src/remote.ts'

function listen(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolve() })
  })
}
function address(server: Server) {
  const value = server.address()
  if (!value || typeof value === 'string') throw new Error('NO_LOOPBACK_ADDRESS')
  return `http://127.0.0.1:${(value as AddressInfo).port}`
}

describe('Sub2API DSH bridge contract', () => {
  it('accepts ordinary HTTP(S) service URLs and rejects credential-bearing URLs', () => {
    expect(serviceUrl.parse('http://127.0.0.1:8080')).toBe('http://127.0.0.1:8080')
    expect(() => serviceUrl.parse('http://user:pass@127.0.0.1:8080')).toThrow()
    expect(() => serviceUrl.parse('http://127.0.0.1:8080/?token=secret')).toThrow()
  })

  it('keeps the host status payload small and stable for the browser panel', () => {
    expect(statusSchema.parse({ url: 'http://127.0.0.1:8080', embedUrl: 'http://127.0.0.1:40123', healthy: true, running: false, message: 'ok' })).toEqual({
      url: 'http://127.0.0.1:8080', embedUrl: 'http://127.0.0.1:40123', healthy: true, running: false, message: 'ok',
    })
  })

  it('publishes the bridge methods through the same Typert mount used by poker', () => {
    expect(TYPERT_REMOTE.descriptors.map(item => item.method)).toEqual(['endpoint', 'configure', 'status', 'start', 'stop'])
    expect(TYPERT_REMOTE.descriptors.every(item => item.namespace === 'sub2ApiBridge')).toBe(true)
  })

  it('embeds the official UI through a loopback proxy while preserving requests and session cookies', async () => {
    const upstream = createServer((request, response) => {
      let body = ''
      request.setEncoding('utf8')
      request.on('data', chunk => { body += chunk })
      request.on('end', () => {
        if (request.url === '/health') { response.writeHead(200, { 'content-type': 'application/json' }); response.end('{"ok":true}'); return }
        response.setHeader('set-cookie', ['dsh_session=one; Path=/; HttpOnly', 'csrf=two; Path=/'])
        response.writeHead(201, { 'content-type': 'application/json', 'content-security-policy': "frame-ancestors 'none'", 'x-frame-options': 'DENY' })
        response.end(JSON.stringify({ method: request.method, path: request.url, body, origin: request.headers.origin, cookie: request.headers.cookie }))
      })
    })
    const proxy = createServer((request, response) => { void bridge.forward(request, response) })
    const bridge = new Sub2ApiBridge(new Context(), { requestTimeoutMs: 1000 })
    await Promise.all([listen(upstream), listen(proxy)])
    bridge.upstream = address(upstream)
    try {
      const health = await (bridge as unknown as { check(): Promise<{ healthy: boolean }> }).check()
      expect(health.healthy).toBe(true)
      const response = await fetch(`${address(proxy)}/api/v1/example?kept=1`, {
        method: 'POST',
        headers: { origin: 'null', cookie: 'client=previous' },
        body: JSON.stringify({ hello: 'world' }),
      })
      expect(response.status).toBe(201)
      expect(response.headers.get('content-security-policy')).toBeNull()
      expect(response.headers.get('x-frame-options')).toBeNull()
      expect(response.headers.getSetCookie()).toEqual(['dsh_session=one; Path=/; HttpOnly', 'csrf=two; Path=/'])
      expect(await response.json()).toEqual({
        method: 'POST', path: '/api/v1/example?kept=1', body: '{"hello":"world"}', origin: 'null', cookie: 'client=previous',
      })
    } finally {
      await Promise.all([
        new Promise(resolve => proxy.close(() => resolve(undefined))),
        new Promise(resolve => upstream.close(() => resolve(undefined))),
      ])
    }
  })
})


