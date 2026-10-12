import { spawn, type ChildProcess } from 'node:child_process'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { Readable } from 'node:stream'
import { Service } from '@deepseek-ai/cordis'
import s from '@deepseek-ai/schemastery'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import { z } from 'zod'
import { serviceUrl, statusSchema, type Sub2ApiStatus } from './remote.ts'

const settings = defineDomain({ name: 'local_sub2api', version: 1, layout: 'per-record', tables: { settings: domainTable(z.string()) } })
export const inject = ['typert', 'storageDomain']
export const Config = s.object({
  url: s.string().default('http://127.0.0.1:8080'),
  requestTimeoutMs: s.number().min(1000).max(30000).default(5000),
  autoStart: s.boolean().default(false),
  binaryPath: s.string().default(''),
  workingDirectory: s.string().default(''),
  dataDirectory: s.string().default(''),
  port: s.number().min(1024).max(65535).default(8080),
  args: s.array(s.string()).default([]),
})

export function apply(ctx, config) {
  ctx.plugin(Sub2ApiBridge, config)
}

export class Sub2ApiBridge extends TypertRemoteService {
  static inject = ['typert', 'storageDomain']
  config
  domain
  table
  upstream = ''
  child: ChildProcess | undefined
  proxy
  embedUrl = ''
  lastMessage = ''
  aborts = new Set<AbortController>()

  constructor(ctx, config) {
    super(ctx, 'sub2ApiBridge')
    this.config = config
  }

  async [Service.init]() {
    this.domain = await this.ctx.storageDomain.open(settings)
    this.table = this.domain.table('settings')
    this.upstream = serviceUrl.parse(this.config.url || await this.table.get('url') || 'http://127.0.0.1:8080').replace(/\/+$/, '')
    await this.startProxy()
    this.ctx.effect(() => async () => {
      for (const abort of this.aborts) abort.abort()
      await this.stopProcess()
      await this.stopProxy()
      await this.domain.close()
    }, 'sub2api: process and settings')
    if (this.config.autoStart && this.config.binaryPath) {
      try { await this.startProcess() } catch (error) { this.lastMessage = String(error) }
    }
  }

  @Remote
  endpoint() { return this.upstream }

  @Remote
  async configure(url) {
    const value = serviceUrl.parse(url).replace(/\/+$/, '')
    if (value !== this.upstream && this.child) await this.stopProcess()
    await this.table.put('url', value)
    this.upstream = value
    this.lastMessage = ''
    return value
  }

  @Remote
  async status(signal): Promise<Sub2ApiStatus> {
    return statusSchema.parse({ ...await this.check(signal), embedUrl: this.embedUrl, running: Boolean(this.child) })
  }

  @Remote
  async start(signal): Promise<Sub2ApiStatus> {
    if (!this.child) await this.startProcess()
    return this.status(signal)
  }

  @Remote
  async stop(): Promise<Sub2ApiStatus> {
    await this.stopProcess()
    return this.status()
  }

  private async startProcess() {
    if (!this.config.binaryPath) throw new Error('SUB2API_BINARY_NOT_CONFIGURED')
    if (this.child) return
    const args = [...this.config.args]
    const env = { ...process.env, SERVER_HOST: '127.0.0.1', SERVER_PORT: String(this.config.port) }
    if (this.config.dataDirectory) env.DATA_DIR = this.config.dataDirectory
    const cwd = this.config.workingDirectory || undefined
    this.upstream = this.upstream || `http://127.0.0.1:${this.config.port}`
    const child = spawn(this.config.binaryPath, args, { cwd, env, stdio: 'ignore', windowsHide: true })
    this.child = child
    child.once('exit', () => { if (this.child === child) this.child = undefined })
    child.once('error', error => { this.lastMessage = String(error); if (this.child === child) this.child = undefined })
    const deadline = Date.now() + Math.max(this.config.requestTimeoutMs, 5000) * 6
    while (Date.now() < deadline) {
      try { if ((await this.check()).healthy) return } catch {}
      await new Promise(resolve => setTimeout(resolve, 250))
    }
    await this.stopProcess()
    throw new Error(this.lastMessage || 'SUB2API_START_TIMEOUT')
  }

  private async stopProcess() {
    const child = this.child
    if (!child) return
    this.child = undefined
    child.kill()
    await new Promise(resolve => {
      const timer = setTimeout(resolve, 1500)
      child.once('close', () => { clearTimeout(timer); resolve(undefined) })
    })
  }

  private async startProxy() {
    if (this.proxy) return
    const server = createServer((request, response) => { void this.forward(request, response) })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolve() })
    })
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('SUB2API_PROXY_START_FAILED')
    this.proxy = server
    this.embedUrl = `http://127.0.0.1:${address.port}`
  }

  private async stopProxy() {
    const server = this.proxy
    if (!server) return
    this.proxy = undefined
    await new Promise<void>(resolve => server.close(() => resolve()))
    this.embedUrl = ''
  }

  private async forward(request: IncomingMessage, response: ServerResponse) {
    try {
      if (!this.upstream) throw new Error('SUB2API_NOT_CONFIGURED')
      const target = new URL(request.url || '/', `${this.upstream}/`)
      const headers = new Headers()
      for (const [key, value] of Object.entries(request.headers)) {
        if (value !== undefined && !['host', 'connection', 'content-length'].includes(key.toLowerCase())) headers.set(key, Array.isArray(value) ? value.join(', ') : value)
      }
      const chunks: Buffer[] = []
      for await (const chunk of request) {
        const data = Buffer.from(chunk)
        if (chunks.reduce((size, item) => size + item.length, 0) + data.length > 32_000_000) throw new Error('SUB2API_PROXY_BODY_TOO_LARGE')
        chunks.push(data)
      }
      const body = chunks.length === 0 || request.method === 'GET' || request.method === 'HEAD' ? undefined : Buffer.concat(chunks)
      const upstream = await fetch(target, { method: request.method, headers, body, redirect: 'manual', duplex: body ? 'half' : undefined })
      response.statusCode = upstream.status
      upstream.headers.forEach((value, key) => {
        if (['content-security-policy', 'content-length', 'content-encoding', 'x-frame-options', 'connection'].includes(key)) return
        if (key === 'location') {
          try { response.setHeader(key, new URL(value, this.embedUrl).pathname + new URL(value, this.embedUrl).search) } catch { response.setHeader(key, value) }
        } else if (key === 'set-cookie') response.setHeader(key, upstream.headers.getSetCookie())
        else response.setHeader(key, value)
      })
      if (!upstream.body) { response.end(); return }
      await Readable.fromWeb(upstream.body as never).pipe(response)
    } catch (error) {
      if (!response.headersSent) response.writeHead(502, { 'content-type': 'application/json; charset=utf-8' })
      response.end(JSON.stringify({ error: String(error) }))
    }
  }

  private async check(signal?: AbortSignal) {
    if (!this.upstream) return { url: this.upstream, healthy: false, message: 'SUB2API_NOT_CONFIGURED' }
    const abort = new AbortController()
    this.aborts.add(abort)
    const cancel = () => abort.abort()
    signal?.addEventListener('abort', cancel, { once: true })
    const timer = setTimeout(cancel, this.config.requestTimeoutMs)
    try {
      const response = await fetch(`${this.upstream}/health`, { redirect: 'error', signal: abort.signal })
      if (!response.ok) throw new Error(`HTTP_${response.status}`)
      return { url: this.upstream, healthy: true, message: 'ok' }
    } catch (error) {
      this.lastMessage = error instanceof Error ? error.message : String(error)
      return { url: this.upstream, healthy: false, message: this.lastMessage }
    } finally {
      clearTimeout(timer)
      this.aborts.delete(abort)
      signal?.removeEventListener('abort', cancel)
    }
  }
}
