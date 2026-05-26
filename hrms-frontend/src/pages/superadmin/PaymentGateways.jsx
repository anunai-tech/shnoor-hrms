// Superadmin payment gateway configuration — automatic gateways (Razorpay, Cashfree,
// PayU, Paytm, PayPal) and manual gateways (UPI, bank transfer).
// Secret keys are never shown after saving — only placeholder text indicates they're set.

import { useState, useEffect } from 'react'
import {
  getPaymentGateways, updatePaymentGateway,
  getManualPaymentSettings, updateManualPaymentSettings
} from '../../services/superadminService'

// Display labels and accent colors per gateway — used in GatewayCard rendering.
const GATEWAY_INFO = {
  razorpay: { label: 'Razorpay', publicLabel: 'Key ID',        secretLabel: 'Secret Key',    accent: '#2563EB' },
  cashfree: { label: 'Cashfree', publicLabel: 'App ID',        secretLabel: 'Secret Key',    accent: '#10B981' },
  payu:     { label: 'PayU',     publicLabel: 'Merchant Key',  secretLabel: 'Salt',          accent: '#F59E0B' },
  paytm:    { label: 'Paytm',    publicLabel: 'Merchant ID',   secretLabel: 'Merchant Key',  accent: '#1E3A8A' },
  paypal:   { label: 'PayPal',   publicLabel: 'Client ID',     secretLabel: 'Client Secret', accent: '#003087' },
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-yellow-400' : 'bg-gray-200'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

function GatewayCard({ gateway, onChange, onSave, saving }) {
  const info = GATEWAY_INFO[gateway.gateway_name] || {
    label: gateway.gateway_name, publicLabel: 'Public Key', secretLabel: 'Secret Key', accent: '#888'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-bold text-white text-xs"
            style={{ backgroundColor: info.accent }}
          >
            {info.label.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-display text-sm font-semibold text-gray-800">{info.label}</p>
            <p className="font-body text-xs text-gray-400 mt-0.5">
              {gateway.is_active ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
        <Toggle
          checked={gateway.is_active}
          onChange={(val) => onChange(gateway.gateway_name, 'is_active', val)}
        />
      </div>

      <div className="space-y-4">
        <div>
          <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">
            {info.publicLabel}
          </label>
          <input
            type="text"
            value={gateway.public_key || ''}
            onChange={(e) => onChange(gateway.gateway_name, 'public_key', e.target.value)}
            placeholder={`Enter ${info.publicLabel}`}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition font-body"
          />
        </div>

        <div>
          <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">
            {info.secretLabel}
          </label>
          <input
            type="password"
            value={gateway.secret_key || ''}
            onChange={(e) => onChange(gateway.gateway_name, 'secret_key', e.target.value)}
            placeholder={gateway.has_secret ? 'Leave blank to keep existing secret' : `Enter ${info.secretLabel}`}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition font-body"
          />
          {gateway.has_secret && (
            <p className="font-body text-xs text-gray-400 mt-1">
              Secret is saved. Enter a new value to replace it.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div>
          {gateway.saved && <p className="font-body text-xs text-green-600">Saved successfully</p>}
          {gateway.error && <p className="font-body text-xs text-red-500">{gateway.error}</p>}
        </div>
        <button
          onClick={() => onSave(gateway.gateway_name)}
          disabled={saving === gateway.gateway_name}
          className="font-display bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
        >
          {saving === gateway.gateway_name ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

function PaymentGateways() {
  const [activeTab, setActiveTab] = useState('automatic')
  const [gateways, setGateways] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)

  const [manualForm, setManualForm] = useState({
    upi_id: '', upi_name: '', upi_is_active: false,
    bank_name: '', bank_account_no: '', bank_ifsc: '',
    bank_holder: '', bank_is_active: false,
  })
  const [manualLoading, setManualLoading] = useState(true)
  const [manualSaving, setManualSaving] = useState(false)
  const [manualSaved, setManualSaved] = useState(false)
  const [manualError, setManualError] = useState('')

  useEffect(() => {
    fetchGateways()
    fetchManual()
  }, [])

  const fetchGateways = async () => {
    try {
      const res = await getPaymentGateways()
      // Initialize each gateway with empty secret — user must re-enter to change it.
      setGateways(res.data.data.map(g => ({
        ...g,
        public_key: g.public_key_masked || '',
        secret_key: '',
        saved: false,
        error: null,
      })))
    } catch (err) {
      console.error('fetchGateways error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchManual = async () => {
    try {
      const res = await getManualPaymentSettings()
      const d = res.data.data
      if (d) {
        setManualForm({
          upi_id: d.upi_id || '',
          upi_name: d.upi_name || '',
          upi_is_active: d.upi_is_active || false,
          bank_name: d.bank_name || '',
          bank_account_no: d.bank_account_no_masked || '',
          bank_ifsc: d.bank_ifsc || '',
          bank_holder: d.bank_holder || '',
          bank_is_active: d.bank_is_active || false,
        })
      }
    } catch (err) {
      console.error('fetchManual error:', err)
    } finally {
      setManualLoading(false)
    }
  }

  // Update a single field on one gateway in local state only — no API call yet.
  const handleGatewayChange = (name, field, value) => {
    setGateways(prev => prev.map(g =>
      g.gateway_name === name
        ? { ...g, [field]: value, saved: false, error: null }
        : g
    ))
  }

  const handleGatewaySave = async (name) => {
    const gateway = gateways.find(g => g.gateway_name === name)
    setSaving(name)
    try {
      await updatePaymentGateway(name, {
        is_active: gateway.is_active,
        public_key: gateway.public_key,
        secret_key: gateway.secret_key,
      })
      // Clear secret input after save — mark has_secret true so placeholder shows.
      setGateways(prev => prev.map(g =>
        g.gateway_name === name
          ? { ...g, secret_key: '', saved: true, error: null, has_secret: true }
          : g
      ))
      setTimeout(() => {
        setGateways(prev => prev.map(g =>
          g.gateway_name === name ? { ...g, saved: false } : g
        ))
      }, 3000)
    } catch (err) {
      setGateways(prev => prev.map(g =>
        g.gateway_name === name ? { ...g, error: 'Failed to save. Try again.' } : g
      ))
    } finally {
      setSaving(null)
    }
  }

  const handleManualChange = (field, value) => {
    setManualForm(prev => ({ ...prev, [field]: value }))
    setManualSaved(false)
  }

  const handleManualSave = async () => {
    setManualSaving(true)
    setManualError('')
    try {
      await updateManualPaymentSettings(manualForm)
      setManualSaved(true)
      setTimeout(() => setManualSaved(false), 3000)
    } catch (err) {
      setManualError('Failed to save. Please try again.')
    } finally {
      setManualSaving(false)
    }
  }

  if (loading && manualLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="font-body text-gray-400 text-sm">Loading payment settings...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      <div>
        <h1 className="font-display text-2xl font-bold text-gray-800">Payment Gateways</h1>
        <p className="font-body text-sm text-gray-400 mt-1">
          Configure automatic and manual payment collection methods
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: 'automatic', label: 'Automatic Gateways' },
          { key: 'manual',    label: 'Manual Gateways' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`font-display px-5 py-2.5 text-sm font-semibold border-b-2 -mb-px transition ${
              activeTab === tab.key
                ? 'border-yellow-400 text-yellow-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Automatic gateways tab */}
      {activeTab === 'automatic' && (
        <div className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {gateways.map(gateway => (
              <GatewayCard
                key={gateway.gateway_name}
                gateway={gateway}
                onChange={handleGatewayChange}
                onSave={handleGatewaySave}
                saving={saving}
              />
            ))}
          </div>
        </div>
      )}

      {/* Manual gateways tab */}
      {activeTab === 'manual' && (
        <div className="space-y-6">

          {/* UPI section */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <div>
                <p className="font-display text-base font-semibold text-gray-800">UPI Collection</p>
                <p className="font-body text-xs text-gray-400 mt-0.5">
                  Dynamic QR is generated per invoice — client scans and pays exact amount
                </p>
              </div>
              <Toggle
                checked={manualForm.upi_is_active}
                onChange={(val) => handleManualChange('upi_is_active', val)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">UPI ID</label>
                <input
                  type="text"
                  value={manualForm.upi_id}
                  onChange={(e) => handleManualChange('upi_id', e.target.value)}
                  placeholder="shnoor@hdfc"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition font-body"
                />
              </div>
              <div>
                <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">Display Name on UPI</label>
                <input
                  type="text"
                  value={manualForm.upi_name}
                  onChange={(e) => handleManualChange('upi_name', e.target.value)}
                  placeholder="SHNOOR International LLC"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition font-body"
                />
              </div>
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
              <p className="font-body text-xs text-blue-600">
                The QR encodes the exact invoice amount and a unique reference number.
                Client's UPI app shows the amount automatically — no manual entry needed.
              </p>
            </div>
          </div>

          {/* Bank transfer section */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <div>
                <p className="font-display text-base font-semibold text-gray-800">Bank Transfer (NEFT / IMPS)</p>
                <p className="font-body text-xs text-gray-400 mt-0.5">
                  Client transfers directly — you verify the payment manually before activating
                </p>
              </div>
              <Toggle
                checked={manualForm.bank_is_active}
                onChange={(val) => handleManualChange('bank_is_active', val)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">Bank Name</label>
                <input
                  type="text"
                  value={manualForm.bank_name}
                  onChange={(e) => handleManualChange('bank_name', e.target.value)}
                  placeholder="HDFC Bank"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition font-body"
                />
              </div>
              <div>
                <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">Account Holder Name</label>
                <input
                  type="text"
                  value={manualForm.bank_holder}
                  onChange={(e) => handleManualChange('bank_holder', e.target.value)}
                  placeholder="SHNOOR International LLC"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition font-body"
                />
              </div>
              <div>
                <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">
                  Account Number
                  {manualForm.bank_account_no?.includes('•') && (
                    <span className="ml-2 font-body font-normal text-gray-400">— clear to enter new</span>
                  )}
                </label>
                <input
                  type="password"
                  value={manualForm.bank_account_no}
                  onChange={(e) => handleManualChange('bank_account_no', e.target.value)}
                  placeholder="Enter account number"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition font-body"
                />
              </div>
              <div>
                <label className="font-display block text-xs font-medium text-gray-500 mb-1.5">IFSC Code</label>
                <input
                  type="text"
                  value={manualForm.bank_ifsc}
                  onChange={(e) => handleManualChange('bank_ifsc', e.target.value.toUpperCase())}
                  placeholder="HDFC0001234"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition font-body"
                />
              </div>
            </div>

            <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3">
              <p className="font-body text-xs text-amber-700">
                Always cross-check the transferred amount against your bank statement before
                confirming a payment. Payment screenshots can be edited.
              </p>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-between">
            <div>
              {manualSaved && (
                <p className="font-body text-sm text-green-600">Manual settings saved successfully</p>
              )}
              {manualError && (
                <p className="font-body text-sm text-red-500">{manualError}</p>
              )}
            </div>
            <button
              onClick={handleManualSave}
              disabled={manualSaving}
              className="font-display bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition"
            >
              {manualSaving ? 'Saving...' : manualSaved ? 'Saved!' : 'Save Manual Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PaymentGateways