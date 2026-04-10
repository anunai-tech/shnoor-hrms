import { useEffect, useRef } from 'react'
import {
  formatMessageTimestamp,
  getUserInitials,
  isImageAttachment,
  resolveMessageFileUrl
} from '../../utils/messageUtils'

function ChatWindow({
  conversation,
  messages,
  currentUserId,
  loading,
  quickQuestions = [],
  onQuickQuestion
}) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, conversation?.user_id])

  if (!conversation) {
    return (
      <div className="flex min-h-[70vh] flex-1 items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/40 to-white px-6 text-center">
        <div className="max-w-md space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-xl font-semibold text-white">
            C
          </div>
          <h3 className="text-xl font-semibold text-slate-900">Conversation will appear here</h3>
          <p className="text-sm leading-6 text-slate-500">
            Select a conversation from the list to view history, attachments, and read status.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-slate-200 bg-white px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
            {getUserInitials(conversation.first_name, conversation.last_name)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900">
              {conversation.first_name} {conversation.last_name}
            </h2>
            <p className="truncate text-sm text-slate-500">
              {conversation.designation || conversation.email}
            </p>
          </div>
        </div>
      </div>

      {quickQuestions.length > 0 && onQuickQuestion && (
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
            Quick Questions
          </p>
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map(question => (
              <button
                key={question.id}
                type="button"
                onClick={() => onQuickQuestion(question.text)}
                className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition hover:border-blue-300 hover:text-blue-600"
              >
                {question.text}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 via-blue-50/40 to-white px-4 py-5 sm:px-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(item => (
              <div key={item} className={`flex ${item % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                <div className="h-20 w-full max-w-md animate-pulse rounded-3xl bg-slate-200"></div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full min-h-72 items-center justify-center text-center">
            <div className="max-w-md space-y-3">
              <h3 className="text-lg font-semibold text-slate-800">No messages yet</h3>
              <p className="text-sm leading-6 text-slate-500">
                Start the conversation with a message, quick question, or attachment.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map(message => {
              const isOwnMessage = Number(message.sender_id) === Number(currentUserId)
              const attachmentUrl = resolveMessageFileUrl(message.file_url)
              const hasImageAttachment = isImageAttachment(message.file_type)

              return (
                <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-[28px] px-4 py-3 shadow-sm sm:max-w-[75%] border border-slate-200 bg-white text-slate-800 ${
                      isOwnMessage ? 'rounded-tr-none' : 'rounded-tl-none'
                    }`}
                  >
                    {message.message && (
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.message}</p>
                    )}

                    {attachmentUrl && hasImageAttachment && (
                      <a href={attachmentUrl} target="_blank" rel="noreferrer" className="mt-3 block overflow-hidden rounded-2xl">
                        <img
                          src={attachmentUrl}
                          alt={message.file_name || 'Attachment'}
                          className="max-h-64 w-full rounded-2xl object-cover"
                        />
                      </a>
                    )}

                    {attachmentUrl && !hasImageAttachment && (
                      <a
                        href={attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`mt-3 inline-flex items-center rounded-2xl px-3 py-2 text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200`}
                      >
                        {message.file_name || 'Open attachment'}
                      </a>
                    )}

                    <div className={`mt-3 flex items-center gap-2 text-[11px] text-slate-400`}>
                      <span>{formatMessageTimestamp(message.created_at)}</span>
                      {isOwnMessage && (
                        <span className="font-semibold text-slate-500">
                          {message.seen_status ? 'Seen' : 'Unseen'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef}></div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatWindow
