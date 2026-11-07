import { useEffect, useState } from 'react'

export type ClaudeBrand = 'claude' | 'deepseek'
export type ClaudeHomeLayout = 'studio' | 'classic'
export type ClaudeSidebarLayout = 'relaxed' | 'compact'
export type ClaudePermissionMode = 'read' | 'edit' | 'yolo'
export type ClaudeViewTab = 'chat' | 'trace'
export type ClaudeSidebarEntryId = 'plugins' | 'search' | 'projects' | 'activity' | 'scheduled'

export interface ClaudeStylePrefs {
  brand: ClaudeBrand
  homeLayout: ClaudeHomeLayout
  sidebarLayout: ClaudeSidebarLayout
  permissionMode: ClaudePermissionMode
  viewTab: ClaudeViewTab
  mascot: boolean
  userName: string
  hiddenSidebarEntries: ClaudeSidebarEntryId[]
}

const STORAGE_KEY = 'gooeypi:dsh-claude-style-prefs'

export const DEFAULT_CLAUDE_STYLE_PREFS: ClaudeStylePrefs = {
  brand: 'claude',
  homeLayout: 'studio',
  sidebarLayout: 'relaxed',
  permissionMode: 'edit',
  viewTab: 'chat',
  mascot: true,
  userName: 'Ada',
  hiddenSidebarEntries: ['search', 'projects', 'activity', 'scheduled'],
}

type Listener = (prefs: ClaudeStylePrefs) => void

let currentPrefs: ClaudeStylePrefs = readStoredPrefs()
const listeners = new Set<Listener>()

function readStoredPrefs(): ClaudeStylePrefs {
  if (typeof window === 'undefined') return DEFAULT_CLAUDE_STYLE_PREFS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_CLAUDE_STYLE_PREFS
    const parsed = JSON.parse(raw) as Partial<ClaudeStylePrefs>
    return {
      brand: parsed.brand === 'deepseek' ? 'deepseek' : 'claude',
      homeLayout: parsed.homeLayout === 'classic' ? 'classic' : 'studio',
      sidebarLayout: parsed.sidebarLayout === 'compact' ? 'compact' : 'relaxed',
      permissionMode: parsed.permissionMode === 'read' || parsed.permissionMode === 'yolo' ? parsed.permissionMode : 'edit',
      viewTab: parsed.viewTab === 'trace' ? 'trace' : 'chat',
      mascot: typeof parsed.mascot === 'boolean' ? parsed.mascot : true,
      userName: typeof parsed.userName === 'string' && parsed.userName.trim() ? parsed.userName.trim() : 'Ada',
      hiddenSidebarEntries: Array.isArray(parsed.hiddenSidebarEntries)
        ? parsed.hiddenSidebarEntries.filter((id): id is ClaudeSidebarEntryId => id === 'plugins' || id === 'search' || id === 'projects' || id === 'activity' || id === 'scheduled')
        : DEFAULT_CLAUDE_STYLE_PREFS.hiddenSidebarEntries,
    }
  } catch {
    return DEFAULT_CLAUDE_STYLE_PREFS
  }
}

export function syncClaudeStyleBodyAttributes(prefs: ClaudeStylePrefs = currentPrefs): void {
  if (typeof document === 'undefined' || !document.body) return
  const body = document.body
  body.setAttribute('data-dsh-claude-style', '0.20.0')
  body.setAttribute('data-dsh-claude-palette', 'claude')
  body.setAttribute('data-dsh-claude-brand', prefs.brand)
  body.setAttribute('data-dsh-claude-palette-card', prefs.brand)
  body.setAttribute('data-dsh-claude-home-layout', prefs.homeLayout)
  body.setAttribute('data-dsh-claude-sidebar-layout', prefs.sidebarLayout)
  body.setAttribute('data-dsh-claude-permission-mode', prefs.permissionMode)
  body.setAttribute('data-dsh-claude-view-tab', prefs.viewTab)
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
  body.toggleAttribute('data-ds-dark-theme', isDark)
}

export function getClaudeStylePrefs(): ClaudeStylePrefs {
  return currentPrefs
}

export function updateClaudeStylePrefs(patch: Partial<ClaudeStylePrefs>): ClaudeStylePrefs {
  currentPrefs = { ...currentPrefs, ...patch }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPrefs))
    } catch {
      // Ignore storage quota errors in sandboxed/test environments.
    }
  }
  syncClaudeStyleBodyAttributes(currentPrefs)
  for (const listener of listeners) listener(currentPrefs)
  return currentPrefs
}

export function useClaudeStylePrefs(): [ClaudeStylePrefs, (patch: Partial<ClaudeStylePrefs>) => void] {
  const [prefs, setPrefs] = useState<ClaudeStylePrefs>(() => currentPrefs)

  useEffect(() => {
    syncClaudeStyleBodyAttributes(currentPrefs)
    const listener: Listener = (next) => setPrefs(next)
    listeners.add(listener)
    const observer = typeof MutationObserver !== 'undefined' && typeof document !== 'undefined'
      ? new MutationObserver(() => syncClaudeStyleBodyAttributes(currentPrefs))
      : null
    if (observer && document.documentElement) {
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    }
    return () => {
      listeners.delete(listener)
      observer?.disconnect()
    }
  }, [])

  return [prefs, updateClaudeStylePrefs]
}
