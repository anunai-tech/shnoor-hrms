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
    refreshWorkspace
  } = useMessagingWorkspace({
    withQuickQuestions: false,
    autoSelect: 'unread_first'
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
          <p className="mt-1 text-sm text-slate-500">
            Review employee conversations, track unread items, and respond from a unified inbox.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Unread
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{unreadCount}</p>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Employee Chats
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{conversations.length}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-[28px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700 sm:flex-row sm:items-center sm:justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => refreshWorkspace()}
            className="rounded-full bg-white px-4 py-2 font-semibold text-amber-700 transition hover:bg-amber-100"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <ChatList
          title="Employee Inbox"
          subtitle="Every employee conversation is separated and preserved."
          conversations={conversations}
          activeConversationId={activeConversation?.user_id}
          onSelectConversation={selectConversation}
          loading={listLoading}
          emptyMessage="No employees are available for messaging yet."
        />

        <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <ChatWindow
            conversation={activeConversation}
            messages={messages}
            currentUserId={user?.id}
            loading={conversationLoading}
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
