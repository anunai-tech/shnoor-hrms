import { useState } from 'react'
import {
  formatConversationTimestamp,
  getConversationPreview,
  getUserInitials
} from '../../utils/messageUtils'

function ChatList({
  title,
  subtitle,
  conversations,
  activeConversationId,
  onSelectConversation,
  loading,
  emptyMessage
}) {
  const [search, setSearch] = useState('')

  const filteredConversations = conversations.filter(conversation => {
    const searchValue = search.toLowerCase()
    return `${conversation.first_name || ''} ${conversation.last_name || ''}`.toLowerCase().includes(searchValue)
      || (conversation.email || '').toLowerCase().includes(searchValue)
      || (conversation.department || '').toLowerCase().includes(searchValue)
      || (conversation.designation || '').toLowerCase().includes(searchValue)
      || getConversationPreview(conversation).toLowerCase().includes(searchValue)
  })

  return (
    <section className="flex min-h-[70vh] w-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm xl:max-w-sm">
      <div className="border-b border-slate-200 px-5 py-5">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search conversations"
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:bg-white"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-3 p-4">
            {[1, 2, 3].map(item => (
              <div key={item} className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-slate-200"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-32 rounded bg-slate-200"></div>
                    <div className="h-3 w-48 rounded bg-slate-200"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex h-full min-h-64 items-center justify-center px-6 text-center">
            <p className="text-sm text-slate-400">{emptyMessage}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredConversations.map(conversation => {
              const isActive = conversation.user_id === activeConversationId

              return (
                <button
                  key={conversation.user_id}
                  type="button"
                  onClick={() => onSelectConversation(conversation)}
                  className={`flex w-full items-start gap-3 px-5 py-4 text-left transition ${
                    isActive ? 'bg-blue-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                    {getUserInitials(conversation.first_name, conversation.last_name)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {conversation.first_name} {conversation.last_name}
                        </p>
                        <p className="truncate text-xs text-slate-400">
                          {conversation.designation || conversation.email}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <span className="whitespace-nowrap text-xs text-slate-400">
                          {formatConversationTimestamp(conversation.last_message_at)}
                        </span>
                        {conversation.unread_count > 0 && (
                          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-semibold text-white">
                            {conversation.unread_count > 99 ? '99+' : conversation.unread_count}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 truncate text-sm text-slate-500">
                      {getConversationPreview(conversation)}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default ChatList
