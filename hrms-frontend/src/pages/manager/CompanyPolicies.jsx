import { useState, useEffect } from 'react'
import { getPolicies, createPolicy, deletePolicy } from '../../services/managerService'

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="text-base font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

function CompanyPolicies() {
  const [policies, setPolicies] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPolicy, setSelectedPolicy] = useState(null)
  const [formData, setFormData] = useState({ title: '', content: '' })
  const [search, setSearch] = useState('')

  useEffect(() => { fetchPolicies() }, [])

  const fetchPolicies = async () => {
    try {
      const res = await getPolicies()
      setPolicies(res.data.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = policies.filter(p => p.title.toLowerCase().includes(search.toLowerCase()))

  const handleAdd = async () => {
    try {
      await createPolicy(formData)
      setShowAddModal(false)
      setFormData({ title: '', content: '' })
      fetchPolicies()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async () => {
    try {
      await deletePolicy(selectedPolicy.id)
      setShowDeleteModal(false)
      fetchPolicies()
    } catch (err) {
      console.error(err)
    }
  }

  // ✅ JSX variable
  const formFields = (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Policy Title</label>
        <input name="title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
          placeholder="e.g. Leave Policy"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Policy Content</label>
        <textarea name="content" value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})}
          placeholder="Write the full policy details here..." rows={6}
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
      </div>
    </div>
  )

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-gray-400">Loading...</p></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Company Policies</h1>
          <p className="text-sm text-gray-400 mt-1">Manage and share company policies</p>
        </div>
        <button onClick={() => setShowAddModal(true)}
          className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition">
          + Add Policy
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search policies..."
        className="w-full max-w-sm border border-gray-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-2 text-center py-10 text-sm text-gray-400">No policies found</div>
        ) : (
          filtered.map(policy => (
            <div key={policy.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-base font-semibold text-gray-800 mb-2">{policy.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{policy.content}</p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">{new Date(policy.created_at).toLocaleDateString('en-GB')}</p>
                <div className="flex items-center gap-3">
                  <button onClick={() => { setSelectedPolicy(policy); setShowViewModal(true) }}
                    className="text-xs text-blue-600 hover:underline font-medium">View</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={() => { setSelectedPolicy(policy); setShowDeleteModal(true) }}
                    className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAddModal && (
        <Modal title="Add New Policy" onClose={() => setShowAddModal(false)}>
          {formFields}
          <div className="flex gap-3 mt-6">
            <button onClick={handleAdd} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Add Policy</button>
            <button onClick={() => setShowAddModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}

      {showViewModal && selectedPolicy && (
        <Modal title={selectedPolicy.title} onClose={() => setShowViewModal(false)}>
          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{selectedPolicy.content}</p>
          </div>
          <button onClick={() => setShowViewModal(false)}
            className="w-full mt-6 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Close</button>
        </Modal>
      )}

      {showDeleteModal && (
        <Modal title="Delete Policy" onClose={() => setShowDeleteModal(false)}>
          <p className="text-sm text-gray-600">Are you sure you want to delete <span className="font-semibold">{selectedPolicy?.title}</span>?</p>
          <div className="flex gap-3 mt-6">
            <button onClick={handleDelete} className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg transition">Delete</button>
            <button onClick={() => setShowDeleteModal(false)} className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default CompanyPolicies