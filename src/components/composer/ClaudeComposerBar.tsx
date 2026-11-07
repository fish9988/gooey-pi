import { Check, ChevronDown, Folder, Sparkles } from 'lucide-react'
import { useState } from 'react'
import {
  type ClaudePermissionMode,
  useClaudeStylePrefs,
} from '@/lib/claude-style-prefs'
import { useDismissableLayer } from '@/hooks/useDismissableLayer'
import { HARNESS_PRODUCT_NAMES, HARNESS_SELECTOR_ORDER } from '@/lib/harness'
import { useI18n } from '@/lib/i18n'
import type { HarnessId, PrimeContextUsage, PrimeThinkingLevel, ProjectRecord, SessionUsage } from '@/types/api'

const PERMISSION_PRESETS: ReadonlyArray<{
  id: ClaudePermissionMode
  shortLabel: string
  convLabelEn: string
  convLabelZh: string
  descEn: string
  descZh: string
}> = [
  {
    id: 'read',
    shortLabel: 'Read',
    convLabelEn: 'Read only',
    convLabelZh: '只读模式',
    descEn: 'Read and analyze files without making edits',
    descZh: '仅读取与分析文件，不修改工作区内容',
  },
  {
    id: 'edit',
    shortLabel: 'Edit',
    convLabelEn: 'Accept edits',
    convLabelZh: 'Accept edits',
    descEn: 'Automatically apply file edits in workspace',
    descZh: '自动应用工作区内的文件修改与补丁',
  },
  {
    id: 'yolo',
    shortLabel: 'Yolo',
    convLabelEn: 'Yolo mode',
    convLabelZh: 'Yolo 全自动',
    descEn: 'Run commands and edits without confirmation prompts',
    descZh: '无需确认直接执行文件修改与终端命令',
  },
]

export function ClaudeHeroWorkspaceRow({
  project,
  projects = [],
  harness = 'omp',
  onSelectProject,
  onSelectHarness,
}: {
  project?: ProjectRecord
  projects?: ProjectRecord[]
  harness?: HarnessId
  onSelectProject?(project: ProjectRecord): void
  onSelectHarness?(harness: HarnessId): void
}) {
  const { locale } = useI18n()
  const isZh = locale === 'zh-CN' || typeof navigator === 'undefined' || navigator.language.startsWith('zh')
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)
  const [modeMenuOpen, setModeMenuOpen] = useState(false)

  useDismissableLayer(
    projectMenuOpen,
    (target) => target instanceof Element && Boolean(target.closest('.dsh-claude-hero-project-picker')),
    () => setProjectMenuOpen(false),
  )
  useDismissableLayer(
    modeMenuOpen,
    (target) => target instanceof Element && Boolean(target.closest('.dsh-claude-hero-mode-picker')),
    () => setModeMenuOpen(false),
  )

  return (
    <div className="dsh-claude-hero-workspace-row" data-dsh-claude-part="hero-workspace-row">
      <div className="dsh-claude-hero-project-picker">
        <button
          type="button"
          className="dsh-claude-hero-chip"
          onClick={() => setProjectMenuOpen((open) => !open)}
          title={project?.path ?? 'demo-project'}
        >
          <Folder size={13} />
          <span>{project?.name ?? 'demo-project'}</span>
        </button>
        {projectMenuOpen && projects.length > 0 ? (
          <div className="dsh-claude-popover-card dsh-claude-hero-popover" data-open="true" role="menu">
            <div className="dsh-claude-popover-body">
              {projects.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  role="menuitem"
                  className="dsh-claude-popover-item"
                  onClick={() => {
                    setProjectMenuOpen(false)
                    onSelectProject?.(candidate)
                  }}
                >
                  <span className="dsh-claude-popover-item-icon"><Folder size={14} /></span>
                  <span className="dsh-claude-popover-item-text">{candidate.name}</span>
                  {candidate.id === project?.id ? (
                    <span className="dsh-claude-popover-check"><Check size={14} /></span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="dsh-claude-hero-mode-picker">
        <button
          type="button"
          className="dsh-claude-hero-chip"
          onClick={() => setModeMenuOpen((open) => !open)}
        >
          <Sparkles size={13} />
          <span>{isZh ? '标准模式' : HARNESS_PRODUCT_NAMES[harness]}</span>
        </button>
        {modeMenuOpen ? (
          <div className="dsh-claude-popover-card dsh-claude-hero-popover" data-open="true" role="menu">
            <div className="dsh-claude-popover-body">
              {HARNESS_SELECTOR_ORDER.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="menuitem"
                  className="dsh-claude-popover-item"
                  onClick={() => {
                    setModeMenuOpen(false)
                    onSelectHarness?.(id)
                  }}
                >
                  <span className="dsh-claude-popover-item-text">{HARNESS_PRODUCT_NAMES[id]}</span>
                  {id === harness ? (
                    <span className="dsh-claude-popover-check"><Check size={14} /></span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function ClaudePermissionControl({ isHero }: { isHero: boolean }) {
  const { locale } = useI18n()
  const isZh = locale === 'zh-CN' || typeof navigator === 'undefined' || navigator.language.startsWith('zh')
  const [prefs, updatePrefs] = useClaudeStylePrefs()
  const [open, setOpen] = useState(false)

  useDismissableLayer(
    open,
    (target) => target instanceof Element && Boolean(target.closest('.dsh-claude-perm-container')),
    () => setOpen(false),
  )

  if (isHero) {
    return (
      <div className="dsh-claude-segments" role="radiogroup" aria-label={isZh ? '权限模式' : 'Permission mode'}>
        {PERMISSION_PRESETS.map((preset) => {
          const active = prefs.permissionMode === preset.id
          return (
            <button
              key={preset.id}
              type="button"
              role="radio"
              aria-checked={active}
              className="dsh-claude-segment"
              data-active={active ? '' : undefined}
              onClick={() => updatePrefs({ permissionMode: preset.id })}
            >
              {preset.shortLabel}
            </button>
          )
        })}
      </div>
    )
  }

  const activePreset = PERMISSION_PRESETS.find((p) => p.id === prefs.permissionMode) ?? PERMISSION_PRESETS[1]

  return (
    <div className="dsh-claude-perm-container">
      <button
        type="button"
        className="dsh-claude-perm-btn"
        data-open={open ? 'true' : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="dsh-claude-perm-label">
          {isZh ? activePreset.convLabelZh : activePreset.convLabelEn}
        </span>
        <ChevronDown size={12} />
      </button>
      {open ? (
        <div className="dsh-claude-popover-card dsh-claude-perm-popover" data-open="true" role="menu">
          <div className="dsh-claude-popover-body">
            {PERMISSION_PRESETS.map((preset) => {
              const checked = preset.id === prefs.permissionMode
              return (
                <button
                  key={preset.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={checked}
                  className="dsh-claude-popover-item"
                  onClick={() => {
                    updatePrefs({ permissionMode: preset.id })
                    setOpen(false)
                  }}
                >
                  <span className="dsh-claude-popover-item-col">
                    <span className="dsh-claude-popover-item-text">
                      {isZh ? preset.convLabelZh : preset.convLabelEn}
                    </span>
                    <span className="dsh-claude-popover-item-desc">
                      {isZh ? preset.descZh : preset.descEn}
                    </span>
                  </span>
                  {checked ? <span className="dsh-claude-popover-check"><Check size={14} /></span> : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function ClaudeInlineSessionStats({
  contextUsage,
  sessionUsage,
}: {
  contextUsage?: PrimeContextUsage
  sessionUsage?: SessionUsage
}) {
  const { locale } = useI18n()
  const isZh = locale === 'zh-CN' || typeof navigator === 'undefined' || navigator.language.startsWith('zh')
  const [open, setOpen] = useState(false)

  useDismissableLayer(
    open,
    (target) => target instanceof Element && Boolean(target.closest('.dsh-claude-inline-stats-wrap')),
    () => setOpen(false),
  )

  const totalTokens = sessionUsage?.tokens?.total ?? contextUsage?.tokens ?? 5400
  const formattedTokens = totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}K` : String(totalTokens)
  const cacheRead = sessionUsage?.tokens?.cacheRead ?? 0
  const cacheRate = cacheRead > 0 && totalTokens > 0
    ? `${Math.round((cacheRead / totalTokens) * 100)}%`
    : '0%'

  return (
    <div className="dsh-claude-inline-stats-wrap">
      <button
        type="button"
        className="dsh-claude-inline-stats"
        onClick={() => setOpen((current) => !current)}
      >
        <span>{isZh ? `1轮1步 · 467tok/s · ${formattedTokens} tok · ${cacheRate} Cache` : `1 turn · 467 tok/s · ${formattedTokens} tok · ${cacheRate} Cache`}</span>
      </button>
      {open ? (
        <div className="dsh-claude-popover-card dsh-claude-stats-popover" data-open="true">
          <div className="dsh-claude-context-stats">
            <span className="dsh-claude-context-stats-section">{isZh ? '会话统计' : 'SESSION STATS'}</span>
            <div className="dsh-claude-context-stats-grid">
              <div className="dsh-claude-context-stats-item">
                <span className="dsh-claude-context-stats-label">{isZh ? '总 Token' : 'Total tokens'}</span>
                <span className="dsh-claude-context-stats-value">{formattedTokens}</span>
              </div>
              <div className="dsh-claude-context-stats-item">
                <span className="dsh-claude-context-stats-label">{isZh ? '输出速度' : 'Throughput'}</span>
                <span className="dsh-claude-context-stats-value">467 tok/s</span>
              </div>
              <div className="dsh-claude-context-stats-item">
                <span className="dsh-claude-context-stats-label">{isZh ? '缓存命中率' : 'Cache hit'}</span>
                <span className="dsh-claude-context-stats-value">{cacheRate}</span>
              </div>
              <div className="dsh-claude-context-stats-item">
                <span className="dsh-claude-context-stats-label">{isZh ? '轮次与步骤' : 'Turns & steps'}</span>
                <span className="dsh-claude-context-stats-value">{isZh ? '1 轮 · 1 步' : '1 turn · 1 step'}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const EFFORT_LABELS: Record<PrimeThinkingLevel, string> = {
  off: 'Off',
  minimal: 'Minimal',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  xhigh: 'XHigh',
  max: 'Max',
}

export function ClaudeEffortPicker({
  effort,
  levels,
  onChange,
}: {
  effort: PrimeThinkingLevel
  levels: readonly PrimeThinkingLevel[]
  onChange(value: PrimeThinkingLevel): void
}) {
  const { locale } = useI18n()
  const isZh = locale === 'zh-CN' || typeof navigator === 'undefined' || navigator.language.startsWith('zh')
  const [open, setOpen] = useState(false)

  useDismissableLayer(
    open,
    (target) => target instanceof Element && Boolean(target.closest('.dsh-claude-effort-seat')),
    () => setOpen(false),
  )

  const activeLevels = levels.length > 0 ? levels : (['low', 'medium', 'high'] as const)
  const index = Math.max(0, activeLevels.indexOf(effort))
  const progress = activeLevels.length > 1 ? index / (activeLevels.length - 1) : 1
  const isApex = index === activeLevels.length - 1

  return (
    <div className="dsh-claude-effort-seat">
      <button
        type="button"
        className="dsh-claude-effort-btn"
        data-effort={effort}
        onClick={() => setOpen((current) => !current)}
        title={isZh ? `推理强度: ${EFFORT_LABELS[effort]}` : `Reasoning effort: ${EFFORT_LABELS[effort]}`}
      >
        <span>{EFFORT_LABELS[effort] ?? 'High'}</span>
      </button>
      {open ? (
        <div className="dsh-claude-popover-card dsh-claude-effort-popover" data-open="true">
          <div className="dsh-claude-effort" data-apex={isApex ? '' : undefined}>
            <div className="dsh-claude-effort-head">
              <span className="dsh-claude-effort-label">{isZh ? '推理强度' : 'Reasoning effort'}</span>
              <span className="dsh-claude-effort-value">{EFFORT_LABELS[effort]}</span>
            </div>
            <button
              type="button"
              className="dsh-claude-effort-track"
              onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect()
                const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)))
                const nextIdx = Math.round(ratio * (activeLevels.length - 1))
                const next = activeLevels[nextIdx]
                if (next) onChange(next)
              }}
            >
              <div
                className="dsh-claude-effort-fill"
                style={{ width: `${Math.max(12, Math.round(progress * 100))}%` }}
              />
              <div className="dsh-claude-effort-ticks">
                {activeLevels.map((lvl, idx) => {
                  const pct = activeLevels.length > 1 ? (idx / (activeLevels.length - 1)) * 100 : 50
                  return (
                    <span
                      key={lvl}
                      className="dsh-claude-effort-tick"
                      style={{ left: `${Math.max(6, Math.min(94, pct))}%` }}
                    />
                  )
                })}
              </div>
              <span
                className="dsh-claude-effort-knob"
                style={{ left: `calc(${progress * 100}% - ${progress * 30}px)` }}
              />
            </button>
            <div className="dsh-claude-effort-ends">
              <span>{isZh ? '更快' : 'Faster'}</span>
              <span>{isZh ? '更强' : 'Stronger'}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
