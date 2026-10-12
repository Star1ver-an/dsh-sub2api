import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-store'

type State = { open: boolean }
type Actions = { setOpen: (draft: State, open: boolean) => void }

export function createSub2ApiStore(): EngineStoreHandle<State, Actions> {
  return defineStore({
    init: () => ({ open: false }),
    actions: { setOpen: (draft, open: boolean) => { draft.open = open } },
  })
}
