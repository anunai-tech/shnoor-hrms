import { useEffect, useRef, useState } from 'react'

const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024
const EMOJI_CHOICES = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','🥲','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','👽','👾','🤖','🎃',
  '👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✍️','💅','🤳','💪','🦾','🦵','🦿','🦶','👣',
  '❤','🧡','💛','💚','💙','💜','🤎','🖤','🤍','💔','❣','💕','💞','💓','💗','💖','💘','💝','💟','💯','💢','💬','👁️‍🗨️','🗨️','🗯️','💭','💤',
  '☕','🍵','⚽','🏀','🏈','⚾','🎾','🎉','🎊','🎈','🎂','🎁','🏆','🏅','🎖','🔥','⭐','🌟','✨','⚡','💥'
]

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error('Failed to read selected file'))
  reader.readAsDataURL(file)
})

function MessageInput({ onSend, disabled, placeholder }) {
  const [message, setMessage] = useState('')
  const [attachment, setAttachment] = useState(null)
  const [showActions, setShowActions] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')

  const actionsRef = useRef(null)
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target)) {
        setShowActions(false)
        setShowEmojiPicker(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const clearComposer = () => {
    setMessage('')
    setAttachment(null)
    setError('')
    setShowActions(false)
    setShowEmojiPicker(false)
  }

  const handleAttachmentPick = async (file) => {
    if (!file) return

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError('Attachments must be 5 MB or smaller')
      return
    }

    try {
      const content = await readFileAsDataUrl(file)
      setAttachment({
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size,
        content,
        preview_url: file.type.startsWith('image/') ? content : ''
      })
      setError('')
      setShowActions(false)
    } catch (err) {
      setError(err.message || 'Unable to process attachment')
    }
  }

  const handleSend = async () => {
    if (disabled || isSending || (!message.trim() && !attachment)) {
      return
    }

    setIsSending(true)
    setError('')

    try {
      await onSend({
        message: message.trim(),
        attachment
      })
      clearComposer()
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const handleTextareaKeyDown = async (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      await handleSend()
    }
  }

  const insertEmoji = (emoji) => {
    setMessage(currentMessage => `${currentMessage}${emoji}`)
  }

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
      {attachment && (
        <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{attachment.name}</p>
              <p className="mt-1 text-xs text-slate-400">
                {(attachment.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100"
            >
              Remove
            </button>
          </div>
          {attachment.preview_url && (
            <img
              src={attachment.preview_url}
              alt={attachment.name}
              className="mt-3 max-h-40 rounded-2xl object-cover"
            />
          )}
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-end gap-3">
        <div ref={actionsRef} className="relative">
          <button
            type="button"
            onClick={() => setShowActions(currentValue => !currentValue)}
            disabled={disabled}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xl font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            +
          </button>

          {showActions && !disabled && (
            <div className="absolute bottom-14 left-0 z-20 w-48 rounded-3xl border border-slate-200 bg-white p-2 shadow-xl">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="mt-1 flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Upload Image
              </button>
              <button
                type="button"
                onClick={() => setShowEmojiPicker(currentValue => !currentValue)}
                className="mt-1 flex w-full items-center rounded-2xl px-3 py-2 text-left text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Emoji Picker
              </button>
            </div>
          )}

          {showEmojiPicker && !disabled && (
            <div className="absolute bottom-14 left-0 z-20 w-72 rounded-3xl border border-slate-200 bg-white p-3 shadow-xl sm:left-52">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Emojis
              </p>
              <div className="grid grid-cols-7 gap-1 max-h-60 overflow-y-auto pr-1">
                {EMOJI_CHOICES.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="rounded-xl p-2 text-xl transition hover:bg-slate-100 flex items-center justify-center cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(event) => handleAttachmentPick(event.target.files?.[0])}
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => handleAttachmentPick(event.target.files?.[0])}
          />
        </div>

        <div className="min-w-0 flex-1 rounded-[28px] border border-slate-200 bg-slate-50 px-4 py-3 transition focus-within:border-blue-300 focus-within:bg-white">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            disabled={disabled}
            rows={1}
            placeholder={placeholder}
            className="max-h-32 min-h-[44px] w-full resize-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed"
          />
        </div>

        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || isSending || (!message.trim() && !attachment)}
          className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}

export default MessageInput
