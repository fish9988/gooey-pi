import { useMemo } from 'react'
import { LoaderCircle } from 'lucide-react'
import type { HarnessId, SessionRecord, TranscriptMessage } from '@/types/api'
import { ErrorBoundary } from './ErrorBoundary'
import { MarkdownText } from './MarkdownText'
import { HARNESS_SHORT_NAMES } from '@/lib/harness'
import { useI18n } from '@/lib/i18n'
import { useClaudeStylePrefs } from '@/lib/claude-style-prefs'
import { ClaudeHomeDashboard } from './ClaudeHomeDashboard'
import { HarnessMark } from './HarnessMark'
import { ActivityMessage, AgentMessage, AssistantMessage, GoalMessage, SteerReadMarker, UserMessage } from './transcript/messages'
import { useTranscriptScroll } from './transcript/scroll'
import { LiveElapsed, ThinkingDots, WorkDisclosure } from './transcript/timeline'


export function coalesceAssistantTurns(messages: TranscriptMessage[]): TranscriptMessage[] {
  let changed = false
  const grouped: TranscriptMessage[] = []
  for (const message of messages) {
    const previous = grouped.at(-1)
    if (message.role !== 'assistant' || previous?.role !== 'assistant') {
      grouped.push(message)
      continue
    }
    changed = true
    const streaming = Boolean(previous.streaming || message.streaming)
    grouped[grouped.length - 1] = {
      ...previous,
      completedAt: streaming ? undefined : message.completedAt ?? previous.completedAt,
      streaming,
      parts: [...previous.parts, ...message.parts],
    }
  }
  return changed ? grouped : messages
}

interface TranscriptProps {
  messages: TranscriptMessage[]
  sessions?: SessionRecord[]
  /** Active harness; brands the assistant marks and working copy. */
  harness?: HarnessId
  loading?: boolean
  active?: boolean
  showReasoning?: boolean
  showTools?: boolean
  onSuggestion(prompt: string): void
  suggestionsDisabled?: boolean
  /** Reserve room for bottom-docked changes and queued-message affordances. */
  bottomDockHasChanges?: boolean
  queuedMessageCount?: number
  onOpenSessionReference?(sessionId: string, harness: HarnessId): void
}


function ActiveAssistantMessage({ message, harness, showReasoning, showTools }: { message: TranscriptMessage; harness: HarnessId; showReasoning: boolean; showTools: boolean }) {
  const { t } = useI18n()
  const visibleActivity = message.parts.some((part) => part.type === 'thinking' && showReasoning || (part.type === 'toolCall' || part.type === 'toolResult') && showTools || part.type === 'agentMessage')
  return (
    <article className="message message--assistant">
      <div className="assistant-mark"><HarnessMark harness={harness} /></div>
      <div className="message__content">
        {visibleActivity
          ? <WorkDisclosure message={message} parts={message.parts} showReasoning={showReasoning} showTools={showTools} running />
          : <>
            {message.parts.map((part, index) => part.type === 'text' ? <MarkdownText key={index} text={part.text} streaming={Boolean(message.streaming)} /> : null)}
            <div className="streaming-state" aria-live="polite"><ThinkingDots /> {t('transcript.isWorking', { harness: HARNESS_SHORT_NAMES[harness] })} <LiveElapsed since={message.startedAt ?? message.timestamp} /></div>
          </>}
      </div>
    </article>
  )
}



export function Transcript({ messages, sessions, harness = 'prime', loading, active = false, showReasoning = true, showTools = true, onSuggestion, suggestionsDisabled, bottomDockHasChanges = false, queuedMessageCount = 0, onOpenSessionReference }: TranscriptProps) {
  const { t } = useI18n()
  const [prefs] = useClaudeStylePrefs()
  const groupedMessages = useMemo(() => coalesceAssistantTurns(messages), [messages])
  const { announcement, hiddenCount, scrollRef, showEarlier, updatePinnedState, visibleMessages } = useTranscriptScroll(groupedMessages, HARNESS_SHORT_NAMES[harness])
  const activeAssistantId = useMemo(() => active && groupedMessages.at(-1)?.role === 'assistant' ? groupedMessages.at(-1)?.id : undefined, [active, groupedMessages])
  const isHero = !loading && messages.length === 0
  const transcriptClasses = [
    'transcript',
    'scroll-area',
    isHero ? 'transcript--hero' : '',
    bottomDockHasChanges ? 'has-docked-changes' : '',
    queuedMessageCount > 0 ? 'has-queued-messages' : '',
  ].filter(Boolean).join(' ')

  return (
    <div ref={scrollRef} className={transcriptClasses} data-view-tab={prefs.viewTab} aria-busy={loading} onScroll={updatePinnedState}>
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
      <div className="transcript__inner">
        {loading ? <div className="transcript-loading"><LoaderCircle className="spin" size={16} /> {t('transcript.loadingSession')}</div> : null}
        {isHero ? (
          <ClaudeHomeDashboard
            harness={harness}
            sessions={sessions}
            onSuggestion={onSuggestion}
            suggestionsDisabled={suggestionsDisabled}
          />
        ) : null}
        {hiddenCount > 0 ? <button type="button" className="transcript__show-earlier" onClick={showEarlier}>{t('transcript.showEarlier', { count: Math.min(250, hiddenCount) })}</button> : null}
        {visibleMessages.map((message) => <ErrorBoundary key={message.id} fallback={<div className="message message--render-failure" role="note">{t('transcript.renderFailure')}</div>}>
          {message.kind === 'steer-read-marker' ? <SteerReadMarker message={message} />
            : message.role === 'user' ? <UserMessage message={message} onOpenSessionReference={onOpenSessionReference} />
            : message.role === 'assistant' ? message.streaming || message.id === activeAssistantId
              ? <ActiveAssistantMessage message={message} harness={harness} showReasoning={showReasoning} showTools={showTools} />
              : <AssistantMessage message={message} harness={harness} showReasoning={showReasoning} showTools={showTools} />
            : message.role === 'agent' ? <AgentMessage message={message} />
            : message.role === 'goal' ? <GoalMessage message={message} />
            : message.role === 'tool' || message.role === 'system' ? <ActivityMessage message={message} harness={harness} />
            : <div className={`message message--${message.role}`}>{message.parts.map((part, partIndex) => part.type === 'text' ? <span key={partIndex}>{part.text}</span> : null)}</div>}
        </ErrorBoundary>)}
        {active && !activeAssistantId ? <article className="message message--assistant transcript-active-placeholder" aria-live="polite">
          <div className="assistant-mark"><HarnessMark harness={harness} /></div><div className="streaming-state"><ThinkingDots /> {t('transcript.isWorking', { harness: HARNESS_SHORT_NAMES[harness] })}</div>
        </article> : null}
        <div />
      </div>
    </div>
  )
}
