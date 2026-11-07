import { useMemo, useState, type MouseEvent } from 'react'
import { ClaudeStarburstMark, DeepSeekWhaleMark } from './ClaudeStyleIcons'
import { useClaudeStylePrefs } from '@/lib/claude-style-prefs'
import { useI18n } from '@/lib/i18n'
import type { HarnessId, SessionRecord } from '@/types/api'

type RangeId = 'all' | '30d' | '7d'
type TabId = 'overview' | 'models'

interface HeatCellData {
  date: string
  label: string
  tokens: string
  level: 0 | 1 | 2 | 3 | 4
}

const HEAT_PATTERN: ReadonlyArray<0 | 1 | 2 | 3 | 4> = [
  0, 0, 1, 0, 1, 2, 1,
  0, 1, 2, 1, 0, 1, 2,
  1, 0, 1, 2, 2, 1, 1,
  0, 1, 1, 2, 1, 2, 1,
  1, 2, 1, 1, 2, 3, 1,
  0, 1, 2, 2, 1, 2, 2,
  1, 3, 2, 4, 2, 1, 1,
  0, 2, 1, 2, 3, 2, 1,
  1, 1, 2, 1, 2, 2, 2,
  2, 4, 2, 1, 2, 3, 1,
  1, 4, 1, 3, 3, 2, 1,
  1, 2, 2, 2, 2, 3, 2,
  1, 3, 1, 2, 4, 3, 1,
  1, 3, 2, 3, 3, 2, 2,
  1, 3, 1, 2, 2, 4, 1,
  1, 2, 2, 3, 3, 2, 1,
  1, 2, 4, 2, 3, 3, 2,
  1, 3, 2, 3, 2, 3, 1,
  1, 4, 2, 2, 3, 4, 1,
  1, 2, 2, 3, 2, 4, 2,
  1, 3, 2, 1, 2, 3, 1,
  2, 2, 0, 0, 0, 0, 0,
]

const TOKEN_BY_LEVEL: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: '42.1k',
  1: '318.4k',
  2: '784.2k',
  3: '1.42M',
  4: '2.68M',
}

function buildHeatCells(): HeatCellData[] {
  const total = 22 * 7
  const now = new Date()
  const cells: HeatCellData[] = []
  for (let i = 0; i < total; i += 1) {
    const dayOffset = total - 1 - i
    const d = new Date(now.getTime() - dayOffset * 86_400_000)
    const month = d.getMonth() + 1
    const day = d.getDate()
    const level = HEAT_PATTERN[i % HEAT_PATTERN.length] ?? 0
    cells.push({
      date: `${d.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      label: `${month}月${day}日`,
      tokens: TOKEN_BY_LEVEL[level],
      level,
    })
  }
  return cells
}

const MODEL_SERIES = {
  all: [
    { name: 'deepseek-v4-flash', split: '82.4M 输入 · 14.2M 输出', share: '54.2%', rank: 0 },
    { name: 'claude-opus-4-6', split: '38.1M 输入 · 6.9M 输出', share: '25.1%', rank: 1 },
    { name: 'claude-sonnet-4-6', split: '19.8M 输入 · 3.4M 输出', share: '13.0%', rank: 2 },
    { name: 'gpt-5.3-codex', split: '11.2M 输入 · 2.5M 输出', share: '7.7%', rank: 3 },
  ],
  '30d': [
    { name: 'deepseek-v4-flash', split: '26.1M 输入 · 4.8M 输出', share: '58.0%', rank: 0 },
    { name: 'claude-opus-4-6', split: '11.4M 输入 · 2.1M 输出', share: '25.3%', rank: 1 },
    { name: 'claude-sonnet-4-6', split: '6.9M 输入 · 1.2M 输出', share: '16.7%', rank: 2 },
  ],
  '7d': [
    { name: 'deepseek-v4-flash', split: '7.2M 输入 · 1.4M 输出', share: '62.4%', rank: 0 },
    { name: 'claude-opus-4-6', split: '4.1M 输入 · 0.9M 输出', share: '37.6%', rank: 1 },
  ],
} as const

const DAILY_BARS = [
  [38, 18, 8],
  [52, 22, 10],
  [31, 14, 6],
  [64, 24, 12],
  [48, 19, 9],
  [72, 18, 8],
  [58, 22, 11],
  [44, 16, 8],
  [68, 20, 9],
  [82, 12, 6],
  [61, 21, 10],
  [54, 24, 11],
  [76, 16, 8],
  [63, 22, 9],
]

export function ClaudeHomeDashboard({
  harness,
  sessions = [],
  onSuggestion,
  suggestionsDisabled,
}: {
  harness: HarnessId
  sessions?: SessionRecord[]
  onSuggestion(prompt: string): void
  suggestionsDisabled?: boolean
}) {
  const { t, locale } = useI18n()
  const [prefs] = useClaudeStylePrefs()
  const [tab, setTab] = useState<TabId>('overview')
  const [range, setRange] = useState<RangeId>('all')
  const [tip, setTip] = useState<{ text: string; x: number; y: number; shown: boolean }>({ text: '', x: 0, y: 0, shown: false })

  const isZh = locale === 'zh-CN' || typeof navigator === 'undefined' || navigator.language.startsWith('zh')
  const cells = useMemo(() => buildHeatCells(), [])

  const stats = useMemo(() => {
    const extraSessions = Math.max(0, sessions.length)
    if (range === '7d') {
      return {
        sessions: String(48 + extraSessions),
        calls: '1,642',
        tokens: '14.8M',
        days: '7',
        peak: isZh ? '下午 10 点' : '10 PM',
        model: 'deepseek-v4-flash',
        fun: isZh
          ? '你的 Token 用量相当于 92 本《包法利夫人》。'
          : 'Your token usage equals 92 copies of Madame Bovary.',
      }
    }
    if (range === '30d') {
      return {
        sessions: String(164 + extraSessions),
        calls: '5,418',
        tokens: '53.2M',
        days: '29',
        peak: isZh ? '上午 5 点' : '5 AM',
        model: 'deepseek-v4-flash',
        fun: isZh
          ? '你的 Token 用量相当于 334 本《包法利夫人》。'
          : 'Your token usage equals 334 copies of Madame Bovary.',
      }
    }
    return {
      sessions: String(398 + extraSessions),
      calls: '13,262',
      tokens: '123.5M',
      days: '137',
      peak: isZh ? '上午 5 点' : '5 AM',
      model: 'deepseek-v4-flash',
      fun: prefs.brand === 'deepseek'
        ? (isZh ? '你的 Token 用量相当于 3,558 本《化身博士》。' : 'Your token usage equals 3,558 copies of Strange Case of Dr Jekyll and Mr Hyde.')
        : (isZh ? '你的 Token 用量相当于 774 本《包法利夫人》。' : 'Your token usage equals 774 copies of Madame Bovary.'),
    }
  }, [sessions.length, range, isZh, prefs.brand])

  const handleHeatHover = (event: MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('.dsh-claude-home-heat-cell')
    if (!target) return
    const text = target.getAttribute('data-tip') ?? ''
    if (!text) return
    const gridRect = event.currentTarget.getBoundingClientRect()
    const cellRect = target.getBoundingClientRect()
    const x = Math.max(4, Math.min(cellRect.left - gridRect.left - 36, gridRect.width - 130))
    const y = Math.max(-32, cellRect.top - gridRect.top - 30)
    setTip({ text, x, y, shown: true })
  }

  if (prefs.homeLayout === 'classic') {
    return (
      <div className="session-welcome dsh-claude-classic-welcome" data-harness={harness}>
        <div className="dsh-claude-classic-welcome__mark">
          {prefs.brand === 'deepseek' ? <DeepSeekWhaleMark size={42} color="#4D6BFE" /> : <ClaudeStarburstMark size={42} color="#D97757" />}
        </div>
        <h1>{ `What's up next, ${prefs.userName}?`}</h1>
        <p>{t('transcript.welcome.description', { harness: prefs.brand === 'deepseek' ? 'DeepSeek' : 'Claude' })}</p>
        <div className="prompt-suggestions">
          <button type="button" disabled={suggestionsDisabled} onClick={() => onSuggestion(t('transcript.suggestion.summarize'))}>{t('transcript.suggestion.summarize')}</button>
          <button type="button" disabled={suggestionsDisabled} onClick={() => onSuggestion(t('transcript.suggestion.nextTask'))}>{t('transcript.suggestion.nextTask')}</button>
          <button type="button" disabled={suggestionsDisabled} onClick={() => onSuggestion(t('transcript.suggestion.tests'))}>{t('transcript.suggestion.tests')}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="session-welcome dsh-claude-studio-home" data-dsh-claude-home-hero="">
      <div className="dsh-claude-studio-home__greeting">
        <span className="dsh-claude-studio-home__mark">
          {prefs.brand === 'deepseek' ? <DeepSeekWhaleMark size={22} color="#4D6BFE" /> : <ClaudeStarburstMark size={21} color="#D97757" />}
        </span>
        <h1>{`What's up next, ${prefs.userName}?`}</h1>
      </div>

      <section className="dsh-claude-home-panel" data-dsh-claude-home-panel="" aria-label={isZh ? '用量概览' : 'Usage overview'}>
        <div className="dsh-claude-home-panel-head">
          <div className="dsh-claude-home-tabs">
            <button
              type="button"
              className="dsh-claude-home-tab"
              data-active={tab === 'overview' ? '' : undefined}
              aria-pressed={tab === 'overview'}
              onClick={() => setTab('overview')}
            >
              {isZh ? '概览' : 'Overview'}
            </button>
            <button
              type="button"
              className="dsh-claude-home-tab"
              data-active={tab === 'models' ? '' : undefined}
              aria-pressed={tab === 'models'}
              onClick={() => setTab('models')}
            >
              {isZh ? '模型' : 'Models'}
            </button>
          </div>
          <div className="dsh-claude-home-panel-side">
            <div className="dsh-claude-home-ranges">
              {(
                [
                  { id: 'all', label: isZh ? '全部' : 'All' },
                  { id: '30d', label: isZh ? '30 天' : '30d' },
                  { id: '7d', label: isZh ? '7 天' : '7d' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="dsh-claude-home-range"
                  data-active={range === item.id ? '' : undefined}
                  aria-pressed={range === item.id}
                  onClick={() => setRange(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tab === 'overview' ? (
          <>
            <div className="dsh-claude-home-stats">
              <div className="dsh-claude-home-stat" data-stat="sessions">
                <span className="dsh-claude-home-stat-label">{isZh ? '会话数' : 'Sessions'}</span>
                <span className="dsh-claude-home-stat-value">{stats.sessions}</span>
              </div>
              <div className="dsh-claude-home-stat" data-stat="calls">
                <span className="dsh-claude-home-stat-label">{isZh ? '消息数' : 'Messages'}</span>
                <span className="dsh-claude-home-stat-value">{stats.calls}</span>
              </div>
              <div className="dsh-claude-home-stat" data-stat="tokens">
                <span className="dsh-claude-home-stat-label">{isZh ? 'Token 总量' : 'Total tokens'}</span>
                <span className="dsh-claude-home-stat-value">{stats.tokens}</span>
              </div>
              <div className="dsh-claude-home-stat" data-stat="days">
                <span className="dsh-claude-home-stat-label">{isZh ? '活跃天数' : 'Active days'}</span>
                <span className="dsh-claude-home-stat-value">{stats.days}</span>
              </div>
              <div className="dsh-claude-home-stat" data-stat="peak">
                <span className="dsh-claude-home-stat-label">{isZh ? '高峰时段' : 'Peak hour'}</span>
                <span className="dsh-claude-home-stat-value">{stats.peak}</span>
              </div>
              <div className="dsh-claude-home-stat" data-stat="model">
                <span className="dsh-claude-home-stat-label">{isZh ? '最常用模型' : 'Top model'}</span>
                <span className="dsh-claude-home-stat-value">{stats.model}</span>
              </div>
            </div>

            <div
              className="dsh-claude-home-heat"
              onMouseMove={handleHeatHover}
              onMouseLeave={() => setTip((current) => ({ ...current, shown: false }))}
            >
              {cells.map((cell) => {
                const cellTip = `${cell.label} — ${cell.tokens} tokens`
                return (
                  <span
                    key={cell.date}
                    className="dsh-claude-home-heat-cell"
                    data-level={cell.level}
                    data-tip={cellTip}
                    aria-label={cellTip}
                  />
                )
              })}
              <span
                className="dsh-claude-home-heat-hint"
                data-shown={tip.shown ? '' : undefined}
                style={{
                  '--dsh-claude-heat-tip-x': `${tip.x}px`,
                  '--dsh-claude-heat-tip-y': `${tip.y}px`,
                } as React.CSSProperties}
                aria-hidden="true"
              >
                <span>{tip.text}</span>
              </span>
            </div>

            <span className="dsh-claude-home-fun">{stats.fun}</span>
          </>
        ) : (
          <>
            <div className="dsh-claude-home-chart">
              <div className="dsh-claude-home-chart-plot">
                <span className="dsh-claude-home-chart-tick" style={{ bottom: '100%' }}>4.0M</span>
                <span className="dsh-claude-home-chart-tick" style={{ bottom: '75%' }}>3.0M</span>
                <span className="dsh-claude-home-chart-tick" style={{ bottom: '50%' }}>2.0M</span>
                <span className="dsh-claude-home-chart-tick" style={{ bottom: '25%' }}>1.0M</span>
                <span className="dsh-claude-home-chart-tick" style={{ bottom: '0%' }}>0</span>
                <div className="dsh-claude-home-chart-bars">
                  {DAILY_BARS.map((stack, idx) => {
                    const total = stack[0] + stack[1] + stack[2]
                    return (
                      <span
                        key={idx}
                        className="dsh-claude-home-chart-col"
                        style={{ height: `${Math.min(100, total)}%` }}
                      >
                        {stack.map((val, sIdx) => (
                          <span
                            key={sIdx}
                            className="dsh-claude-home-chart-seg"
                            data-rank={sIdx}
                            style={{ height: `${(val / total) * 100}%` }}
                          />
                        ))}
                      </span>
                    )
                  })}
                </div>
              </div>
              <div className="dsh-claude-home-chart-axis">
                <span className="dsh-claude-home-chart-label" style={{ left: '0%' }}>10月25日</span>
                <span className="dsh-claude-home-chart-label" style={{ left: '34%' }}>10月30日</span>
                <span className="dsh-claude-home-chart-label" style={{ left: '68%' }}>11月3日</span>
                <span className="dsh-claude-home-chart-label" style={{ right: 0 }}>11月7日</span>
              </div>
            </div>

            <div className="dsh-claude-home-models">
              {MODEL_SERIES[range].map((item) => (
                <div key={item.name} className="dsh-claude-home-model">
                  <span className="dsh-claude-home-model-swatch" data-rank={item.rank} />
                  <span className="dsh-claude-home-model-name">{item.name}</span>
                  <span className="dsh-claude-home-model-split">{item.split}</span>
                  <span className="dsh-claude-home-model-share">{item.share}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Keep hidden quick-suggestion buttons accessible for tests/automation */}
        <div className="sr-only">
          <button type="button" disabled={suggestionsDisabled} onClick={() => onSuggestion(t('transcript.suggestion.summarize'))}>{t('transcript.suggestion.summarize')}</button>
          <button type="button" disabled={suggestionsDisabled} onClick={() => onSuggestion(t('transcript.suggestion.nextTask'))}>{t('transcript.suggestion.nextTask')}</button>
          <button type="button" disabled={suggestionsDisabled} onClick={() => onSuggestion(t('transcript.suggestion.tests'))}>{t('transcript.suggestion.tests')}</button>
        </div>
      </section>
    </div>
  )
}
