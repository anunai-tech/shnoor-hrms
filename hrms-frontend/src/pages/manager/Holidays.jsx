import { useState, useEffect } from 'react'
import { getHolidays, createHoliday, deleteHoliday } from '../../services/managerService'

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

function Holidays() {
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedHoliday, setSelectedHoliday] = useState(null)
  const [formData, setFormData] = useState({ name: '', date: '' })

  useEffect(() => { fetchHolidays() }, [])

  const fetchHolidays = async () => {
    try {
      const res = await getHolidays()
      setHolidays(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = holidays.filter(h => h.name.toLowerCase().includes(search.toLowerCase()))

  const handleAdd = async () => {
    try {
      await createHoliday(formData)
      setShowAddModal(false)
      setFormData({ name: '', date: '' })
      fetchHolidays()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteHoliday(selectedHoliday.id)
      setShowDeleteModal(false)
      fetchHolidays()
    } catch (err) {
      console.error(err)
    }
  }

  // ✅ JSX variable
  const formFields = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Holiday Name</label>
        <input name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
          placeholder="e.g. Diwali"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
        <input name="date" type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Holidays</h1>
          <p className="text-sm text-gray-400 mt-1">Manage company holidays</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
          + Add Holiday
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search holidays..."
            className="w-full max-w-xs border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-gray-400 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium">#</th>
                <th className="text-left px-6 py-3 font-medium">Holiday Name</th>
                <th className="text-left px-6 py-3 font-medium">Date</th>
                <th className="text-left px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="4" className="text-center py-10 text-sm text-gray-400">No holidays found</td></tr>
              ) : (
                filtered.map((h, index) => (
                  <tr key={h.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-400">{index + 1}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">{h.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => { setSelectedHoliday(h); setShowDeleteModal(true) }}
                        className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">{holidays.length} holidays total</p>
        </div>
      </div>

      {showAddModal && (
        <Modal title="Add New Holiday" onClose={() => setShowAddModal(false)}>
          {formFields}
          <div className="flex gap-3 mt-6">
            <button onClick={handleAdd} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Add Holiday</button>
            <button onClick={() => setShowAddModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal title="Delete Holiday" onClose={() => setShowDeleteModal(false)}>
          <p className="text-sm text-gray-600">Are you sure you want to delete <span className="font-semibold">{selectedHoliday?.name}</span>?</p>
          <div className="flex gap-3 mt-6">
            <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Delete</button>
            <button onClick={() => setShowDeleteModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default Holidays