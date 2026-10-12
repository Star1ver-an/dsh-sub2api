import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import { configSchema, type Sub2ApiConfig } from '../config.ts'
import { createSub2ApiStore } from './stores.ts'
import { Sub2ApiPanel, Sub2ApiTrigger, type Sub2ApiInjected } from './Sub2ApiPanel.tsx'
import { en, zh, type Sub2ApiKey } from './locales.ts'

export const Config = configSchema.default(configSchema.parse({}))
export const inject = ['slots', 'locale', 'remote', 'remote.sub2ApiBridge']
declare module '@deepseek-ai/dsh-client-ui-slots' { interface LocaleNamespaceMap { sub2api: Sub2ApiKey } }

export function apply(ctx: Context, input: Partial<Sub2ApiConfig> = {}) {
  const store = createSub2ApiStore()
  const bridge = ctx.remote.sub2ApiBridge as Sub2ApiInjected
  ctx.effect(() => ctx.locale.register('sub2api', { zh, en }), 'ui-sub2api: dictionaries')
  const face = (): { sub2api: Sub2ApiInjected } => ({ sub2api: bridge })
  ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'sub2api', store, locale: 'sub2api', inject: face }, Sub2ApiTrigger))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({ name: 'shell.overlay', id: 'sub2api', store, locale: 'sub2api', inject: face }, Sub2ApiPanel))
}
