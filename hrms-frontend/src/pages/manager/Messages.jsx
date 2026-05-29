import { useState } from 'react'
import ChatList from '../../components/chat/ChatList'
import ChatWindow from '../../components/chat/ChatWindow'
import MessageInput from '../../components/chat/MessageInput'
import { useAuth } from '../../context/AuthContext'
import { useMessaging } from '../../context/MessagingContext'
import { useMessagingWorkspace } from '../../hooks/useMessagingWorkspace'
import { usePlan } from '../../context/PlanContext'
import FeatureGateScreen from '../../components/FeatureGateScreen'

function ManagerMessages() {
  const { user } = useAuth()
  const { unreadCount } = useMessaging()
  const { features, loading: planLoading } = usePlan()
  const [mobileView, setMobileView] = useState('list')
  const {
    conversations,
    activeConversation,
    messages,
    listLoading,
    conversationLoading,
    error,
    selectConversation,
    sendCurrentMessage,
    editCurrentMessage,
    refreshWorkspace
  } = useMessagingWorkspace({
    withQuickQuestions: false,
    autoSelect: 'unread_first'
  })

  if (planLoading) return null
  if (!features?.messaging?.enabled) return <FeatureGateScreen featureName="Internal Messaging" />

  return (
    // Negative margins cancel the layout padding so the chat fills the full available height
    <div className="flex flex-col -m-4 md:-m-6" style={{ height: 'calc(100vh - 4rem)' }}>
      {features?.messaging?.warning && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 mx-4 mt-2">
          <svg className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <p className="font-body text-xs text-amber-700">
            <span className="font-display font-semibold">Approaching messaging limit — </span>
            {features.messaging.remaining} messages remaining this month.
          </p>
        </div>
      )}

      {/* Header and stats — fixed height, doesn't scroll */}
      <div className="flex-shrink-0 px-4 pt-4 md:px-6 md:pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
            <p className="mt-1 text-sm text-slate-500">
              Review employee conversations, track unread items, and respond from a unified inbox.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Unread</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{unreadCount}</p>
            </div>
            <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Employee Chats</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{conversations.length}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex flex-col gap-3 rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700 sm:flex-row sm:items-center sm:justify-between mb-4">
            <span>{error}</span>
            <button type="button" onClick={() => refreshWorkspace()}
              className="rounded-full bg-white px-4 py-2 font-semibold text-amber-700 transition hover:bg-amber-100">
              Retry
            </button>
          </div>
        )}
      </div>

      {/* Chat grid — fills remaining space, inner divs handle their own scroll */}
      <div className="flex-1 min-h-0 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)] px-4 pb-4 md:px-6 md:pb-6 min-h-0">
        {/* Chat list — hidden on mobile when chat is open */}
        <div className={mobileView === 'chat' ? 'hidden xl:block' : 'block'}>
          <ChatList
            title="Employee Inbox"
            subtitle="Every employee conversation is separated and preserved."
            conversations={conversations}
            activeConversationId={activeConversation?.user_id}
            onSelectConversation={(conv) => { selectConversation(conv); setMobileView('chat') }}
            loading={listLoading}
            emptyMessage="No employees found."
          />
        </div>

        {/* Chat window — full screen on mobile, side panel on xl */}
        <section className={`flex flex-col min-h-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm ${mobileView === 'list' ? 'hidden xl:flex' : 'flex'}`}>
          {/* Mobile back button */}
          <div className="xl:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <button
              onClick={() => setMobileView('list')}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back to Inbox
            </button>
          </div>
          <ChatWindow
            conversation={activeConversation}
            messages={messages}
            currentUserId={user?.id}
            loading={conversationLoading}
            onEditMessage={editCurrentMessage}
          />
          <MessageInput
            onSend={sendCurrentMessage}
            disabled={!activeConversation}
            placeholder="Reply to the selected employee"
          />
        </section>
      </div>
    </div>
  )
}

export default ManagerMessages