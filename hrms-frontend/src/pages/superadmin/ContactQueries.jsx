import { useState, useEffect } from 'react'
import { getContactQueries, updateQueryStatus } from '../../services/superadminService'

function Badge({ status }) {
  const styles = {
    'Unread':  'bg-yellow-50 text-yellow-600',
    'Read':    'bg-gray-100 text-gray-500',
    'Replied': 'bg-blue-50 text-blue-600',
  }
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function ContactQueries() {
  const [queries, setQueries] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedQuery, setSelectedQuery] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)

  useEffect(() => { fetchQueries() }, [])

  const fetchQueries = async () => {
    try {
      const res = await getContactQueries()
      setQueries(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = queries.filter(q =>
    statusFilter === 'All' || q.status === statusFilter
  )

  const openQuery = async (query) => {
    if (query.status === 'Unread') {
      try {
        await updateQueryStatus(query.id, 'Read')
        setQueries(queries.map(q => q.id === query.id ? { ...q, status: 'Read' } : q))
        setSelectedQuery({ ...query, status: 'Read' })
      } catch (err) {
        setSelectedQuery(query)
      }
    } else {
      setSelectedQuery(query)
    }
    setShowViewModal(true)
  }

  const markReplied = async (id) => {
    try {
      await updateQueryStatus(id, 'Replied')
      setQueries(queries.map(q => q.id === id ? { ...q, status: 'Replied' } : q))
      setShowViewModal(false)
    } catch (err) {
      console.error(err)
    }
  }

  const unreadCount = queries.filter(q => q.status === 'Unread').length

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Contact Queries</h1>
          <p className="text-sm text-gray-400 mt-1">
            Messages from the landing page contact form
            {unreadCount > 0 && (
              <span className="ml-2 bg-yellow-400 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex gap-2">
          {['All', 'Unread', 'Read', 'Replied'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition
                ${statusFilter === s ? 'bg-yellow-400 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {s}
              {s === 'Unread' && unreadCount > 0 && (
                <span className="ml-1.5 bg-white text-yellow-500 text-xs font-bold px-1.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Name</th>
                <th className="text-left px-6 py-3 font-medium">Email</th>
                <th className="text-left px-6 py-3 font-medium">Subject</th>
                <th className="text-left px-6 py-3 font-medium">Status</th>
                <th className="text-left px-6 py-3 font-medium">Date</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="7" className="text-center py-10 text-sm text-gray-400">No queries found</td></tr>
              ) : (
                filtered.map((query, index) => (
                  <tr key={query.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition ${query.status === 'Unread' ? 'bg-yellow-50/30' : ''}`}>
                    <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4">
                      <p className={`text-sm ${query.status === 'Unread' ? 'font-semibold text-gray-800' : 'font-medium text-gray-700'}`}>
                        {query.name}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{query.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{query.subject}</td>
                    <td className="px-6 py-4"><Badge status={query.status} /></td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(query.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => openQuery(query)}
                        className="text-xs text-blue-600 hover:underline font-medium">View</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Showing {filtered.length} of {queries.length} queries</p>
        </div>
      </div>

      {showViewModal && selectedQuery && (
        <Modal title="Contact Query" onClose={() => setShowViewModal(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1">From</p>
                <p className="text-sm font-semibold text-gray-800">{selectedQuery.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1">Date</p>
                <p className="text-sm text-gray-600">{new Date(selectedQuery.created_at).toLocaleDateString('en-GB')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1">Email</p>
                <p className="text-sm text-gray-600">{selectedQuery.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium mb-1">Status</p>
                <Badge status={selectedQuery.status} />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Subject</p>
              <p className="text-sm font-semibold text-gray-800">{selectedQuery.subject}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium mb-1">Message</p>
              <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 rounded-lg p-4">{selectedQuery.message}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            {selectedQuery.status !== 'Replied' && (
              <button onClick={() => markReplied(selectedQuery.id)}
                className="flex-1 bg-yellow-400 hover:bg-yellow-500 text-white text-sm font-semibold py-2.5 rounded-lg transition">
                Mark as Replied
              </button>
            )}
            <button onClick={() => setShowViewModal(false)}
              className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default ContactQueries