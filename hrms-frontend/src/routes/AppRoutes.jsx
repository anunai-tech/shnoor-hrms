import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import LoginPage from '../pages/LoginPage'
import SuperAdminLayout from '../layouts/SuperAdminLayout'
import ManagerLayout from '../layouts/ManagerLayout'
import EmployeeLayout from '../layouts/EmployeeLayout'
import SuperAdminDashboard from '../pages/superadmin/SuperAdminDashboard'
import Companies from '../pages/superadmin/Companies'
import Subscriptions from '../pages/superadmin/Subscriptions'
import Transactions from '../pages/superadmin/Transactions'
import AdminManagement from '../pages/superadmin/AdminManagement'
import ContactQueries from '../pages/superadmin/ContactQueries'
import WebsiteSettings from '../pages/superadmin/WebsiteSettings'
import SuperAdminSettings from '../pages/superadmin/Settings'
import ManagerDashboard from '../pages/manager/ManagerDashboard'
import Employees from '../pages/manager/Employees'
import ManagerHolidays from '../pages/manager/Holidays'
import ManagerLeaves from '../pages/manager/Leaves'
import ManagerAttendance from '../pages/manager/Attendance'
import ManagerPolicies from '../pages/manager/CompanyPolicies'
import ManagerSettings from '../pages/manager/Settings'
import SelfDashboard from '../pages/self/SelfDashboard'
import SelfLeaves from '../pages/self/SelfLeaves'
import SelfHolidays from '../pages/self/SelfHolidays'
import SelfAttendance from '../pages/self/SelfAttendance'
import SelfExpenses from '../pages/self/SelfExpenses'
import SelfPolicies from '../pages/self/SelfPolicies'
import SelfProfile from '../pages/self/SelfProfile'
import EmployeeDashboard from '../pages/employee/EmployeeDashboard'
import EmployeeLeaves from '../pages/employee/EmployeeLeaves'
import EmployeeHolidays from '../pages/employee/EmployeeHolidays'
import EmployeeAttendance from '../pages/employee/EmployeeAttendance'
import EmployeeExpenses from '../pages/employee/EmployeeExpenses'
import EmployeePolicies from '../pages/employee/EmployeePolicies'
import EmployeeProfile from '../pages/employee/EmployeeProfile'
import LandingPage from '../pages/LandingPage'
import ManagerExpenses from '../pages/manager/ManagerExpenses'
import SuperAdminProfile from '../pages/superadmin/Profile'
import EmployeeSettings from '../pages/employee/Settings'
import SalaryManagement from '../pages/manager/SalaryManagement'
import SelfSalary from '../pages/self/SelfSalary'
import EmployeeSalary from '../pages/employee/EmployeeSalary'
import Offboarding from '../pages/manager/Offboarding'
import PrivacyPolicy from '../pages/PrivacyPolicy'
import Terms from '../pages/Terms'
import ForgotPassword from '../pages/ForgotPassword'
import Letters from '../pages/manager/Letters'
import EmployeeLetters from '../pages/employee/EmployeeLetters'
import EmployeeOffboarding from '../pages/employee/EmployeeOffboarding'
import SelfLetters from '../pages/self/SelfLetters'


// ── Helper: wraps page with layout + protection ──────────
function SuperAdminPage({ component: Component }) {
  return (
    <ProtectedRoute allowedRoles={['superadmin']}>
      <SuperAdminLayout>
        <Component />
      </SuperAdminLayout>
    </ProtectedRoute>
  )
}

function ManagerPage({ component: Component }) {
  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <ManagerLayout>
        <Component />
      </ManagerLayout>
    </ProtectedRoute>
  )
}

function EmployeePage({ component: Component }) {
  return (
    <ProtectedRoute allowedRoles={['employee']}>
      <EmployeeLayout>
        <Component />
      </EmployeeLayout>
    </ProtectedRoute>
  )
}

// ── App Routes ───────────────────────────────────────────
function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* PUBLIC */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />


        {/* SUPER ADMIN */}
        <Route path="/superadmin/dashboard" element={<SuperAdminPage component={SuperAdminDashboard} />} />
        <Route path="/superadmin/companies" element={<SuperAdminPage component={Companies} />} />
        <Route path="/superadmin/subscriptions" element={<SuperAdminPage component={Subscriptions} />} />
        <Route path="/superadmin/transactions" element={<SuperAdminPage component={Transactions} />} />
        <Route path="/superadmin/admin-management" element={<SuperAdminPage component={AdminManagement} />} />
        <Route path="/superadmin/contact-queries" element={<SuperAdminPage component={ContactQueries} />} />
        <Route path="/superadmin/website-settings" element={<SuperAdminPage component={WebsiteSettings} />} />
        <Route path="/superadmin/settings" element={<SuperAdminPage component={SuperAdminSettings} />} />
        <Route path="/superadmin/profile" element={<SuperAdminPage component={SuperAdminProfile} />} />

        {/* MANAGER */}
        <Route path="/manager/dashboard" element={<ManagerPage component={ManagerDashboard} />} />
        <Route path="/manager/employees" element={<ManagerPage component={Employees} />} />
        <Route path="/manager/holidays" element={<ManagerPage component={ManagerHolidays} />} />
        <Route path="/manager/leaves" element={<ManagerPage component={ManagerLeaves} />} />
        <Route path="/manager/attendance" element={<ManagerPage component={ManagerAttendance} />} />
        <Route path="/manager/expenses" element={<ManagerPage component={ManagerExpenses} />} />
        <Route path="/manager/salary" element={<ManagerPage component={SalaryManagement} />} />
        <Route path="/manager/policies" element={<ManagerPage component={ManagerPolicies} />} />
        <Route path="/manager/settings" element={<ManagerPage component={ManagerSettings} />} />
        <Route path="/manager/self/salary" element={<ManagerPage component={SelfSalary} />} />
        <Route path="/manager/offboarding" element={<ManagerPage component={Offboarding} />} />
        <Route path="/manager/letters" element={<ManagerPage component={Letters} />} />



        {/* MANAGER SELF */}
        <Route path="/manager/self/dashboard" element={<ManagerPage component={SelfDashboard} />} />
        <Route path="/manager/self/holidays" element={<ManagerPage component={SelfHolidays} />} />
        <Route path="/manager/self/leaves" element={<ManagerPage component={SelfLeaves} />} />
        <Route path="/manager/self/attendance" element={<ManagerPage component={SelfAttendance} />} />
        <Route path="/manager/self/expenses" element={<ManagerPage component={SelfExpenses} />} />
        <Route path="/manager/self/policies" element={<ManagerPage component={SelfPolicies} />} />
        <Route path="/manager/self/profile" element={<ManagerPage component={SelfProfile} />} />
        <Route path="/manager/self/letters" element={<ManagerPage component={SelfLetters} />} />

        {/* EMPLOYEE */}
        <Route path="/employee/dashboard" element={<EmployeePage component={EmployeeDashboard} />} />
        <Route path="/employee/leaves" element={<EmployeePage component={EmployeeLeaves} />} />
        <Route path="/employee/holidays" element={<EmployeePage component={EmployeeHolidays} />} />
        <Route path="/employee/attendance" element={<EmployeePage component={EmployeeAttendance} />} />
        <Route path="/employee/expenses" element={<EmployeePage component={EmployeeExpenses} />} />
        <Route path="/employee/policies" element={<EmployeePage component={EmployeePolicies} />} />
        <Route path="/employee/profile" element={<EmployeePage component={EmployeeProfile} />} />
        <Route path="/employee/settings" element={<EmployeePage component={EmployeeSettings} />} />
        <Route path="/employee/salary" element={<EmployeePage component={EmployeeSalary} />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/employee/letters" element={<EmployeePage component={EmployeeLetters} />} />
        <Route path="/employee/offboarding" element={<EmployeePage component={EmployeeOffboarding} />} />

        {/* CATCH ALL */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes