// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClaudeHomeDashboard } from '../../src/components/ClaudeHomeDashboard'
import { ClaudeEffortPicker, ClaudePermissionControl } from '../../src/components/composer/ClaudeComposerBar'
import { TitleToolbar } from '../../src/components/TitleToolbar'
import { updateClaudeStylePrefs } from '../../src/lib/claude-style-prefs'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('DSH Claude Style UI replication', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    window.localStorage.clear()
    updateClaudeStylePrefs({
      brand: 'claude',
      homeLayout: 'studio',
      permissionMode: 'edit',
      viewTab: 'chat',
      mascot: true,
      userName: 'Ada',
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('synchronizes brand and layout attributes onto document.body', () => {
    expect(document.body.getAttribute('data-dsh-claude-brand')).toBe('claude')
    expect(document.body.getAttribute('data-dsh-claude-home-layout')).toBe('studio')

    act(() => {
      updateClaudeStylePrefs({ brand: 'deepseek', viewTab: 'trace' })
    })

    expect(document.body.getAttribute('data-dsh-claude-brand')).toBe('deepseek')
    expect(document.body.getAttribute('data-dsh-claude-view-tab')).toBe('trace')
  })

  it('renders Studio Home usage dashboard with Overview/Models tabs, ranges, and 7x22 heat grid', () => {
    const onSuggestion = vi.fn()
    act(() => {
      root.render(<ClaudeHomeDashboard harness="prime" onSuggestion={onSuggestion} />)
    })

    expect(container.querySelector('.dsh-claude-studio-home__greeting h1')?.textContent).toBe("What's up next, Ada?")
    expect(container.querySelectorAll('.dsh-claude-home-stat')).toHaveLength(6)
    expect(container.querySelectorAll('.dsh-claude-home-heat-cell')).toHaveLength(22 * 7)
    expect(container.querySelector('.dsh-claude-home-fun')?.textContent).toBeTruthy()

    const tabs = [...container.querySelectorAll<HTMLButtonElement>('.dsh-claude-home-tab')]
    expect(tabs).toHaveLength(2)
    act(() => tabs[1].click())
    expect(container.querySelectorAll('.dsh-claude-home-model').length).toBeGreaterThan(0)
  })

  it('renders segmented Read | Edit | Yolo pills on Home and Accept edits popover in Conversation', () => {
    act(() => {
      root.render(<ClaudePermissionControl isHero={true} />)
    })

    const segments = [...container.querySelectorAll<HTMLButtonElement>('.dsh-claude-segment')]
    expect(segments.map((btn) => btn.textContent)).toEqual(['Read', 'Edit', 'Yolo'])
    act(() => segments[2].click())
    expect(document.body.getAttribute('data-dsh-claude-permission-mode')).toBe('yolo')

    act(() => {
      root.render(<ClaudePermissionControl isHero={false} />)
    })
    const permBtn = container.querySelector<HTMLButtonElement>('.dsh-claude-perm-btn')
    expect(permBtn).not.toBeNull()
    act(() => permBtn!.click())
    expect(container.querySelectorAll('.dsh-claude-popover-item')).toHaveLength(3)
  })

  it('renders the Header Chat | Trace segmented switcher and Effort slider popover', () => {
    const onEffortChange = vi.fn()
    act(() => {
      root.render(
        <div>
          <TitleToolbar
            view="session"
            sessionTitle="Markdown rendering tour"
            isHero={false}
            sidebarOpen={true}
            inspectorOpen={false}
            terminalOpen={false}
            onToggleSidebar={() => undefined}
            onToggleInspector={() => undefined}
            onToggleTerminal={() => undefined}
            onOpenBrowser={() => undefined}
          />
          <ClaudeEffortPicker effort="high" levels={['low', 'medium', 'high']} onChange={onEffortChange} />
        </div>,
      )
    })

    const viewTabs = [...container.querySelectorAll<HTMLButtonElement>('.dsh-claude-view-switch button')]
    expect(viewTabs).toHaveLength(2)
    act(() => viewTabs[1].click())
    expect(document.body.getAttribute('data-dsh-claude-view-tab')).toBe('trace')

    const effortBtn = container.querySelector<HTMLButtonElement>('.dsh-claude-effort-btn')!
    expect(effortBtn.textContent).toBe('High')
    act(() => effortBtn.click())
    expect(container.querySelector('.dsh-claude-effort-popover')).not.toBeNull()
  })
})
