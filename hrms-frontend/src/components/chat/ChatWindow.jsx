import { useEffect, useRef, useState } from 'react'
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
  onQuickQuestion,
  onEditMessage
}) {
  const bottomRef = useRef(null)
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [editInputValue, setEditInputValue] = useState('')

  const handleEditInit = (msg) => {
    setEditingMessageId(msg.id)
    setEditInputValue(msg.message)
  }

  const handleEditSave = async (msgId) => {
    if (!editInputValue.trim()) return
    if (onEditMessage) {
      await onEditMessage(msgId, editInputValue)
    }
    setEditingMessageId(null)
    setEditInputValue('')
  }

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
              const isEditing = editingMessageId === message.id

              return (
                <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`group relative max-w-[85%] rounded-[28px] px-4 py-3 shadow-sm sm:max-w-[75%] border border-slate-200 bg-white text-slate-800 ${
                      isOwnMessage ? 'rounded-tr-none' : 'rounded-tl-none'
                    }`}
                  >
                    {!isEditing && isOwnMessage && message.message && (
                      <button
                        onClick={() => handleEditInit(message)}
                        className="absolute top-2 -left-8 rounded-full p-1.5 text-slate-400 opacity-0 bg-white shadow-sm border border-slate-200 hover:text-blue-600 focus:opacity-100 group-hover:opacity-100 transition"
                        title="Edit Message"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                      </button>
                    )}

                    {isEditing ? (
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <textarea
                          value={editInputValue}
                          onChange={(e) => setEditInputValue(e.target.value)}
                          className="w-full text-sm border border-blue-300 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none bg-slate-50"
                          rows={3}
                          autoFocus
                        />
                        <div className="flex gap-2 justify-end mt-1">
                          <button onClick={() => setEditingMessageId(null)} className="text-xs text-slate-500 hover:text-slate-700 font-medium px-2 py-1">Cancel</button>
                          <button onClick={() => handleEditSave(message.id)} className="text-xs bg-blue-600 text-white rounded-lg px-3 py-1.5 font-semibold hover:bg-blue-700 transition">Save Changes</button>
                        </div>
                      </div>
                    ) : (
                      message.message && (
                        <p className="whitespace-pre-wrap text-sm leading-6">{message.message}</p>
                      )
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
                      {message.is_edited && <span className="italic">(edited)</span>}
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
