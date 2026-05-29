import { useState } from 'react'
import ChatList from '../../components/chat/ChatList'
import ChatWindow from '../../components/chat/ChatWindow'
import MessageInput from '../../components/chat/MessageInput'
import { useAuth } from '../../context/AuthContext'
import { useMessaging } from '../../context/MessagingContext'
import { useMessagingWorkspace } from '../../hooks/useMessagingWorkspace'
import { usePlan } from '../../context/PlanContext'
import FeatureGateScreen from '../../components/FeatureGateScreen'

function EmployeeChat() {
  const { user } = useAuth()
  const { unreadCount } = useMessaging()
  const { features, loading: planLoading } = usePlan()
  const [mobileView, setMobileView] = useState('list')
  const {
    conversations,
    activeConversation,
    messages,
    quickQuestions,
    listLoading,
    conversationLoading,
    error,
    selectConversation,
    sendCurrentMessage,
    sendQuickQuestion,
    editCurrentMessage,
    refreshWorkspace
  } = useMessagingWorkspace({
    withQuickQuestions: true,
    autoSelect: 'first'
  })

  if (planLoading) return null
  if (!features?.messaging?.enabled) return <FeatureGateScreen featureName="Internal Messaging" requiredPlan="Pro" />


  return (
    <div className="flex flex-col -m-4 md:-m-6" style={{ height: 'calc(100vh - 4rem)' }}>

      {/* Header — fixed */}
      <div className="flex-shrink-0 px-4 pt-4 md:px-6 md:pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Chat</h1>
            <p className="mt-1 text-sm text-slate-500">
              Message your manager, use quick questions, and keep every conversation in one place.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Unread</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{unreadCount}</p>
            </div>
            <div className="h-12 w-px bg-slate-200"></div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Attachments supported</p>
              <p className="text-xs text-slate-400">Files and screenshots up to 5 MB</p>
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

      {/* Chat grid — fills remaining space */}
      <div className="flex-1 min-h-0 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)] px-4 pb-4 md:px-6 md:pb-6">

        {/* Chat list */}
        <div className={mobileView === 'chat' ? 'hidden xl:block' : 'block'}>
          <ChatList
            title="Your Conversations"
            subtitle="Message your manager or use quick questions below."
            conversations={conversations}
            activeConversationId={activeConversation?.user_id}
            onSelectConversation={(conv) => { selectConversation(conv); setMobileView('chat') }}
            loading={listLoading}
            emptyMessage="No conversations yet."
          />
        </div>

        {/* Chat window */}
        <section className={`flex flex-col min-h-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm ${mobileView === 'list' ? 'hidden xl:flex' : 'flex'}`}>
          <div className="xl:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-100 flex-shrink-0">
            <button
              onClick={() => setMobileView('list')}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>
          <ChatWindow
            conversation={activeConversation}
            messages={messages}
            currentUserId={user?.id}
            loading={conversationLoading}
            onEditMessage={editCurrentMessage}
          />
          {quickQuestions?.length > 0 && !activeConversation?.last_message && (
            <div className="flex-shrink-0 px-4 py-3 border-t border-slate-100 flex flex-wrap gap-2">
              {quickQuestions.map((q, i) => (
                <button key={i} onClick={() => sendQuickQuestion(q)}
                  className="font-body text-xs bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition">
                  {typeof q === 'string' ? q : q?.text || q?.question || ''}
                </button>
              ))}
            </div>
          )}
          <MessageInput
            onSend={sendCurrentMessage}
            disabled={!activeConversation}
            placeholder="Type a message..."
          />
        </section>
      </div>
    </div>
  )
}

export default EmployeeChat