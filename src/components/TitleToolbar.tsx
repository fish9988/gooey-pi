import {
  AudioWaveform,
  ChevronDown,
  Folder,
  GitBranch,
  PanelLeft,
  PanelRight,
  Sparkles,
  Terminal,
} from 'lucide-react'
import type { ApplicationMenuName, ProjectRecord, WorkspaceView } from '@/types/api'
import { useI18n, type MessageKey } from '@/lib/i18n'
import { useClaudeStylePrefs } from '@/lib/claude-style-prefs'
import { APP_SHORTCUT_KEYS } from '@/lib/app-shortcuts'
import { shortcutLabel } from '@/lib/platform-shortcuts'
import { BrowserGlobe, IconButton } from './ui'
import { ProjectRunControl } from './ProjectRunControl'
import type { ProjectScriptKind } from '@/lib/project-scripts'
import type { MouseEvent } from 'react'

const viewTitles: Record<Exclude<WorkspaceView, 'session'>, MessageKey> = {
  projects: 'nav.projects', activity: 'nav.activity', scheduled: 'nav.scheduled', plugins: 'nav.capabilities', settings: 'nav.settings',
}

const windowsMenus: ReadonlyArray<{ name: ApplicationMenuName; label: MessageKey }> = [
  { name: 'file', label: 'toolbar.menuFile' },
  { name: 'edit', label: 'toolbar.menuEdit' },
  { name: 'view', label: 'toolbar.menuView' },
  { name: 'window', label: 'toolbar.menuWindow' },
  { name: 'help', label: 'toolbar.menuHelp' },
]

function openApplicationMenu(menu: ApplicationMenuName, event: MouseEvent<HTMLButtonElement>): void {
  const rect = event.currentTarget.getBoundingClientRect()
  void window.prime?.app.popupMenu?.(menu, rect.left, rect.bottom).catch(() => undefined)
}

interface TitleToolbarProps {
  project?: ProjectRecord
  sessionTitle?: string
  isHero?: boolean
  gitBranch?: string
  view: WorkspaceView
  /** Active harness product name; the session view's fallback title. */
  productName?: string
  sidebarOpen: boolean
  inspectorOpen: boolean
  terminalOpen: boolean
  onToggleSidebar(): void
  onToggleInspector(): void
  onToggleTerminal(): void
  onOpenBrowser(): void
  voiceOpen?: boolean
  onToggleVoice?(): void
  activeProjectScriptKind?: ProjectScriptKind
  onRunProjectScript?(kind: ProjectScriptKind): Promise<void> | void
  onStopProjectScript?(): void
  onSaveProjectScripts?(scripts: { setup: string; run: string }): Promise<void>
  platform?: NodeJS.Platform
}

export function TitleToolbar({ project, sessionTitle, isHero = false, gitBranch, view, productName = 'Prime Work', sidebarOpen, inspectorOpen, terminalOpen, voiceOpen = false, activeProjectScriptKind, onToggleSidebar, onToggleInspector, onToggleTerminal, onOpenBrowser, onToggleVoice, onRunProjectScript, onStopProjectScript, onSaveProjectScripts, platform = 'darwin' }: TitleToolbarProps) {
  const { t, locale } = useI18n()
  const [prefs, updatePrefs] = useClaudeStylePrefs()
  const isZh = locale === 'zh-CN' || typeof navigator === 'undefined' || navigator.language.startsWith('zh')
  const sidebarShortcut = shortcutLabel(platform, APP_SHORTCUT_KEYS['toggle-sidebar'])
  const terminalShortcut = shortcutLabel(platform, APP_SHORTCUT_KEYS['toggle-terminal'])
  const browserShortcut = shortcutLabel(platform, APP_SHORTCUT_KEYS['open-browser'])
  const headerTitle = view === 'session'
    ? (sessionTitle || project?.name || productName)
    : t(viewTitles[view])

  return (
    <header className={`title-toolbar drag-region ${view === 'session' && isHero ? 'title-toolbar--hero' : ''}`} data-dsh-claude-part="conversation-header">
      {!sidebarOpen && platform === 'darwin' ? <div className="traffic-light-clearance traffic-light-clearance--toolbar" aria-hidden="true" /> : null}
      {platform === 'win32' ? <nav className="windows-app-menu" aria-label={t('toolbar.applicationMenu')}>
        {windowsMenus.map(({ name, label }) => <button key={name} type="button" className="windows-app-menu__button" onClick={(event) => openApplicationMenu(name, event)}>{t(label)}</button>)}
      </nav> : null}
      <div className="title-toolbar__nav no-drag">
        {!sidebarOpen ? <IconButton label={t('nav.showSidebarShortcut', { shortcut: sidebarShortcut })} onClick={onToggleSidebar}><PanelLeft size={16} /></IconButton> : null}
      </div>
      <div className="title-toolbar__identity">
        <strong>{headerTitle}</strong>
        {view === 'session' && !isHero ? (
          <span className="dsh-claude-header-mode-chip">
            <Sparkles size={12} />
            <span>{isZh ? '标准模式' : productName}</span>
          </span>
        ) : null}
        {(gitBranch ?? project?.gitBranch) && view === 'session' ? <span className="branch-pill"><GitBranch size={12} />{gitBranch ?? project?.gitBranch}</span> : null}
      </div>
      {view === 'session' && !isHero ? (
        <div className="dsh-claude-header-tabs no-drag" data-dsh-view-tabs="">
          <div className="dsh-claude-view-switch" role="tablist" aria-label={isZh ? '视图切换' : 'Conversation view'}>
            <button
              type="button"
              role="tab"
              aria-selected={prefs.viewTab === 'chat'}
              data-dsh-claude-part={prefs.viewTab === 'chat' ? 'view-tab view-tab-active' : 'view-tab'}
              onClick={() => updatePrefs({ viewTab: 'chat' })}
            >
              {isZh ? '对话' : 'Chat'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={prefs.viewTab === 'trace'}
              data-dsh-claude-part={prefs.viewTab === 'trace' ? 'view-tab view-tab-active' : 'view-tab'}
              onClick={() => updatePrefs({ viewTab: 'trace' })}
            >
              {isZh ? '轨迹' : 'Trace'}
            </button>
          </div>
        </div>
      ) : null}
      <div className="title-toolbar__actions no-drag">
        {view === 'session' && !isHero && project ? (
          <span className="dsh-claude-header-folder-pill" title={project.path}>
            <Folder size={13} fill="#e2a45f" color="#e2a45f" />
            <ChevronDown size={11} />
          </span>
        ) : null}
        {view === 'session' && project && onRunProjectScript && onStopProjectScript && onSaveProjectScripts
          ? <ProjectRunControl project={project} activeKind={activeProjectScriptKind} onRun={onRunProjectScript} onStop={onStopProjectScript} onSave={onSaveProjectScripts} />
          : null}
        {view === 'session' && onToggleVoice ? <IconButton className={voiceOpen ? 'is-active voice-toggle--active' : ''} label={t(voiceOpen ? 'toolbar.realtimeVoice.close' : 'toolbar.realtimeVoice.open')} onClick={onToggleVoice}><AudioWaveform size={17} /></IconButton> : null}
        {view === 'session' ? <IconButton className={terminalOpen ? 'is-active' : ''} label={t('toolbar.toggleTerminalShortcut', { shortcut: terminalShortcut })} onClick={onToggleTerminal}><Terminal size={17} /></IconButton> : null}
        {view === 'session' ? <IconButton label={t('toolbar.openBrowserShortcut', { shortcut: browserShortcut })} onClick={onOpenBrowser}><BrowserGlobe size={18} /></IconButton> : null}
        {view === 'session' ? <IconButton className={inspectorOpen ? 'is-active' : ''} label={t('toolbar.toggleInspector')} onClick={onToggleInspector}><PanelRight size={16} /></IconButton> : null}
        {view !== 'session' && sidebarOpen ? <IconButton label={t('nav.hideSidebarShortcut', { shortcut: sidebarShortcut })} onClick={onToggleSidebar}><PanelLeft size={16} /></IconButton> : null}
      </div>
    </header>
  )
}
