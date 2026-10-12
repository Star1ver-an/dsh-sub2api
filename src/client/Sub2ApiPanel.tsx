import { useEffect, useRef, useState } from 'react'
import type { PropsLocale, PropsRuntime, PropsStore, Translate } from '@deepseek-ai/dsh-client-ui-slots'
import type { Sub2ApiKey } from './locales.ts'
import type { Sub2ApiStatus } from '../remote.ts'
import type { createSub2ApiStore } from './stores.ts'
import css from './Sub2ApiPanel.module.css'

export interface Sub2ApiInjected { endpoint: () => Promise<string>; configure: (url: string) => Promise<string>; status: (signal?: AbortSignal) => Promise<Sub2ApiStatus>; start: () => Promise<Sub2ApiStatus>; stop: () => Promise<Sub2ApiStatus> }
export type Sub2ApiShares = PropsStore<ReturnType<typeof createSub2ApiStore>> & PropsLocale<'sub2api'> & { sub2api: Sub2ApiInjected }
export type Sub2ApiTriggerProps = PropsRuntime<'sidebar.footer.action'> & Sub2ApiShares
export type Sub2ApiPanelProps = PropsRuntime<'shell.overlay'> & Sub2ApiShares

export function Sub2ApiTrigger({ wide, useStore, actions, t }: Sub2ApiTriggerProps) {
  const open = useStore(state => state.open)
  return <button type="button" aria-label={t('trigger')} aria-expanded={open} onClick={() => actions.setOpen(!open)}><span aria-hidden="true">◈</span>{wide && ` ${t('trigger')}`}</button>
}

export function Sub2ApiPanel({ useStore, actions, t, sub2api }: Sub2ApiPanelProps) {
  const open = useStore(state => state.open)
  const dialog = useRef<HTMLDialogElement>(null)
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Sub2ApiStatus | null>(null)
  const [busy, setBusy] = useState(false)
  const [frameKey, setFrameKey] = useState(0)
  const [error, setError] = useState('')
  const tKey = (key: Sub2ApiKey, params?: Record<string, string>) => t(key, params)

  useEffect(() => { if (open) { void sub2api.endpoint().then(setUrl); void refresh() } }, [open])
  useEffect(() => { if (open) dialog.current?.showModal(); else dialog.current?.close() }, [open])

  const refresh = async () => { setBusy(true); setError(''); try { setStatus(await sub2api.status()) } catch (cause) { setError(String(cause)) } finally { setBusy(false) } }
  const save = async () => { setBusy(true); setError(''); try { const value = await sub2api.configure(url.trim()); setUrl(value); setStatus(await sub2api.status()) } catch (cause) { setError(String(cause)) } finally { setBusy(false) } }
  const start = async () => { setBusy(true); setError(''); try { setStatus(await sub2api.start()) } catch (cause) { setError(String(cause)) } finally { setBusy(false) } }
  const stop = async () => { setBusy(true); setError(''); try { setStatus(await sub2api.stop()) } catch (cause) { setError(String(cause)) } finally { setBusy(false) } }
  const healthy = status?.healthy === true
  return <dialog ref={dialog} className={css.dialog} aria-label={tKey('panelTitle')} onCancel={() => actions.setOpen(false)}>
    <div className={css.page}>
      <header className={css.header}><div className={css.brand}><span className={css.logo} aria-hidden="true">◈</span><span>{tKey('panelTitle')}</span></div><div className={css.headerRight}><span className={css.status} data-ready={healthy}><i />{busy ? tKey('checking') : healthy ? tKey('ready') : tKey('offline')}</span><button className={css.close} type="button" aria-label={tKey('close')} onClick={() => actions.setOpen(false)}>×</button></div></header>
      <section className={css.settings}>
        <label>{tKey('url')}<input value={url} onChange={event => setUrl(event.target.value)} spellCheck={false} /></label>
        <div className={css.actions}><button className={`${css.button} ${css.primary}`} type="button" disabled={busy || !url} onClick={() => void save()}>{busy ? tKey('checking') : tKey('save')}</button>{status?.running ? <button className={css.button} type="button" disabled={busy} onClick={() => void stop()}>{tKey('stop')}</button> : <button className={css.button} type="button" disabled={busy} onClick={() => void start()}>{tKey('start')}</button>}{healthy && <button className={css.button} type="button" onClick={() => window.open(status.url, '_blank', 'noopener,noreferrer')}>{tKey('openExternal')}</button>}</div>
        <span className={css.hint}>{tKey('urlHint')} {tKey('embedBlocked')}</span>{error && <span className={css.error}>{tKey('healthError', { message: error })}</span>}
      </section>
      <main className={css.body}>{healthy ? <iframe key={frameKey} className={css.frame} title={tKey('title')} src={status.embedUrl} sandbox="allow-forms allow-modals allow-popups allow-same-origin allow-scripts" /> : <div className={css.empty}><div className={css.emptyCard}><strong>{tKey(status ? 'offline' : 'notConfigured')}</strong><span>{tKey('urlHint')}</span><button className={`${css.button} ${css.primary}`} type="button" disabled={busy} onClick={() => { setFrameKey(value => value + 1); void refresh() }}>{tKey('reload')}</button></div></div>}</main>
    </div>
  </dialog>
}
