import api from './api'

// Dashboard
export const getManagerDashboard = () => api.get('/manager/dashboard')

// Employees
export const getEmployees = () => api.get('/manager/employees')
export const createEmployee = (data) => api.post('/manager/employees', data)
export const updateEmployee = (id, data) => api.put(`/manager/employees/${id}`, data)
export const deleteEmployee = (id) => api.delete(`/manager/employees/${id}`)

// Leaves
export const getLeaves = () => api.get('/manager/leaves')
export const updateLeaveStatus = (id, status) => api.put(`/manager/leaves/${id}`, { status })

// Attendance
export const getAttendance = (date) => api.get(`/manager/attendance${date ? `?date=${date}` : ''}`)

// Expenses
export const getExpenses = () => api.get('/manager/expenses')
export const updateExpenseStatus = (id, status) => api.put(`/manager/expenses/${id}`, { status })

// Salary
export const getSalaries = () => api.get('/manager/salary')
export const upsertSalary = (data) => api.post('/manager/salary', data)

// Holidays
export const getHolidays = () => api.get('/manager/holidays')
export const createHoliday = (data) => api.post('/manager/holidays', data)
export const deleteHoliday = (id) => api.delete(`/manager/holidays/${id}`)

// Policies
export const getPolicies = () => api.get('/manager/policies')
export const createPolicy = (data) => api.post('/manager/policies', data)
export const deletePolicy = (id) => api.delete(`/manager/policies/${id}`)

// Self
export const getMyLeaves = () => api.get('/manager/self/leaves')
export const applyLeave = (data) => api.post('/manager/self/leaves', data)
export const getMyAttendance = () => api.get('/manager/self/attendance')
export const clockIn = () => api.post('/manager/self/clock-in')
export const clockOut = () => api.post('/manager/self/clock-out')
export const getMyExpenses = () => api.get('/manager/self/expenses')
export const submitExpense = (data) => api.post('/manager/self/expenses', data)
export const getMySalary = () => api.get('/manager/self/salary')
export const getManagerProfile = () => api.get('/manager/self/profile')
export const updateManagerProfile = (data) => api.put('/manager/self/profile', data)