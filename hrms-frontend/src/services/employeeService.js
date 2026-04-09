import api from './api'

// Leaves
export const getMyLeaves = () => api.get('/employee/leaves')
export const applyLeave = (data) => api.post('/employee/leaves', data)

// Attendance
export const getMyAttendance = () => api.get('/employee/attendance')
export const clockIn = () => api.post('/employee/clock-in')
export const clockOut = () => api.post('/employee/clock-out')

// Expenses
export const getMyExpenses = () => api.get('/employee/expenses')
export const submitExpense = (data) => api.post('/employee/expenses', data)

// Salary
export const getMySalary = () => api.get('/employee/salary')

// Holidays + Policies
export const getHolidays = () => api.get('/employee/holidays')
export const getPolicies = () => api.get('/employee/policies')

// Payslips
export const getMyPayslips = () => api.get('/employee/payslips')