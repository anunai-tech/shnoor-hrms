import api from './api'

// Plan 
export const getCurrentPlan     = ()       => api.get('/client/plan')
export const getClientInvoices  = ()       => api.get('/client/invoices')
export const getClientTransactions = ()    => api.get('/client/transactions')
export const downloadClientInvoice = (id)  => api.get(`/client/invoices/${id}/download`, { responseType: 'blob' })

// Payment Gateways 
export const getActiveGateways  = ()       => api.get('/client/payment/gateways')
export const getManualDetails   = ()       => api.get('/client/payment/manual-details')

export const createPaymentOrder = (body)   => api.post('/client/payment/create-order', body)
export const verifyPayment      = (body)   => api.post('/client/payment/verify', body)
export const initiateManualPayment = (body)=> api.post('/client/payment/manual/initiate', body)
export const uploadPaymentScreenshot = (data) => api.post('/client/payment/screenshot', data)
export const getPaypalConfig = () => api.get('/client/payment/paypal-config')

