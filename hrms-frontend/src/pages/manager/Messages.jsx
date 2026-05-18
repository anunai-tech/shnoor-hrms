import ChatList from '../../components/chat/ChatList'
import ChatWindow from '../../components/chat/ChatWindow'
import MessageInput from '../../components/chat/MessageInput'
import { useAuth } from '../../context/AuthContext'
import { useMessaging } from '../../context/MessagingContext'
import { useMessagingWorkspace } from '../../hooks/useMessagingWorkspace'

function ManagerMessages() {
  const { user } = useAuth()
  const { unreadCount } = useMessaging()
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

  return (
    // Negative margins cancel the layout padding so the chat fills the full available height
    <div className="flex flex-col -m-4 md:-m-6" style={{ height: 'calc(100vh - 4rem)' }}>

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
      <div className="flex-1 min-h-0 grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)] px-4 pb-4 md:px-6 md:pb-6">
        <ChatList
          title="Employee Inbox"
          subtitle="Every employee conversation is separated and preserved."
          conversations={conversations}
          activeConversationId={activeConversation?.user_id}
          onSelectConversation={selectConversation}
          loading={listLoading}
          emptyMessage="No employees found."
        />

        <section className="flex flex-col min-h-0 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
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