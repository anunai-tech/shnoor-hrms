import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useSubdomain from '../hooks/useSubdomain'
import ProtectedRoute from './ProtectedRoute'
import GuestRoute from './GuestRoute'

// Layouts
import SuperAdminLayout from '../layouts/SuperAdminLayout'
import ManagerLayout from '../layouts/ManagerLayout'
import EmployeeLayout from '../layouts/EmployeeLayout'

// Public / main site pages
import LandingPage from '../pages/LandingPage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import ForgotPassword from '../pages/ForgotPassword'
import SuperAdminLoginPage from '../pages/SuperAdminLoginPage'
import PrivacyPolicy from '../pages/PrivacyPolicy'
import Terms from '../pages/Terms'

// Company subdomain pages
import CompanyLanding from '../pages/company/CompanyLanding'

// Client Area pages
import ClientLayout from '../layouts/ClientLayout'
import ClientDashboard from '../pages/client/ClientDashboard'
import CurrentPlan from '../pages/client/CurrentPlan'
import Usage from '../pages/client/Usage'
import ClientSettings from '../pages/client/Settings'
import Staff from '../pages/client/Managers'
import Billings from '../pages/client/Billings'
import Support from '../pages/client/Support'
import CompanyLoginPage from '../pages/company/CompanyLoginPage'

// SuperAdmin pages
import SuperAdminDashboard from '../pages/superadmin/SuperAdminDashboard'
import Companies from '../pages/superadmin/Companies'
import Subscriptions from '../pages/superadmin/Subscriptions'
import Transactions from '../pages/superadmin/Transactions'
import AdminManagement from '../pages/superadmin/AdminManagement'
import ContactQueries from '../pages/superadmin/ContactQueries'
import WebsiteSettings from '../pages/superadmin/WebsiteSettings'
import SuperAdminSettings from '../pages/superadmin/Settings'
import SuperAdminProfile from '../pages/superadmin/Profile'
import Clients from '../pages/superadmin/Clients'
import SubdomainRequests from '../pages/superadmin/SubdomainRequests'
import PaymentGateways from '../pages/superadmin/PaymentGateways'
import Invoices from '../pages/superadmin/Invoices'

// Manager pages
import ManagerDashboard from '../pages/manager/ManagerDashboard'
import Employees from '../pages/manager/Employees'
import ManagerHolidays from '../pages/manager/Holidays'
import ManagerLeaves from '../pages/manager/Leaves'
import ManagerAttendance from '../pages/manager/Attendance'
import ManagerPolicies from '../pages/manager/CompanyPolicies'
import ManagerSettings from '../pages/manager/Settings'
import ManagerExpenses from '../pages/manager/ManagerExpenses'
import SalaryManagement from '../pages/manager/SalaryManagement'
import Offboarding from '../pages/manager/Offboarding'
import Letters from '../pages/manager/Letters'
import ManagerMessages from '../pages/manager/Messages'

// Manager self pages
import SelfDashboard from '../pages/self/SelfDashboard'
import SelfLeaves from '../pages/self/SelfLeaves'
import SelfHolidays from '../pages/self/SelfHolidays'
import SelfAttendance from '../pages/self/SelfAttendance'
import SelfExpenses from '../pages/self/SelfExpenses'
import SelfPolicies from '../pages/self/SelfPolicies'
import SelfProfile from '../pages/self/SelfProfile'
import SelfSalary from '../pages/self/SelfSalary'
import SelfLetters from '../pages/self/SelfLetters'
import SelfOffboarding from '../pages/self/SelfOffboarding'

// Employee pages
import EmployeeDashboard from '../pages/employee/EmployeeDashboard'
import EmployeeLeaves from '../pages/employee/EmployeeLeaves'
import EmployeeHolidays from '../pages/employee/EmployeeHolidays'
import EmployeeAttendance from '../pages/employee/EmployeeAttendance'
import EmployeeExpenses from '../pages/employee/EmployeeExpenses'
import EmployeePolicies from '../pages/employee/EmployeePolicies'
import EmployeeProfile from '../pages/employee/EmployeeProfile'
import EmployeeSettings from '../pages/employee/Settings'
import EmployeeSalary from '../pages/employee/EmployeeSalary'
import EmployeeLetters from '../pages/employee/EmployeeLetters'
import EmployeeOffboarding from '../pages/employee/EmployeeOffboarding'
import EmployeeChat from '../pages/employee/Chat'

// Role-based layout wrappers
function SuperAdminPage({ component: Component }) {
  return (
    <ProtectedRoute allowedRoles={['superadmin']}>
      <SuperAdminLayout><Component /></SuperAdminLayout>
    </ProtectedRoute>
  )
}

function ManagerPage({ component: Component }) {
  return (
    <ProtectedRoute allowedRoles={['manager']}>
      <ManagerLayout><Component /></ManagerLayout>
    </ProtectedRoute>
  )
}

function ClientPage({ component: Component }) {
  return (
    <ProtectedRoute allowedRoles={['client']}>
      <ClientLayout><Component /></ClientLayout>
    </ProtectedRoute>
  )
}

function EmployeePage({ component: Component }) {
  return (
    <ProtectedRoute allowedRoles={['employee']}>
      <EmployeeLayout><Component /></EmployeeLayout>
    </ProtectedRoute>
  )
}

// routes served on company subdomains (acmecorp.shnoor.com)
function CompanyRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CompanyLanding />} />
        <Route path="/login" element={<GuestRoute><CompanyLoginPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Manager */}
        <Route path="/manager/dashboard" element={<ManagerPage component={ManagerDashboard} />} />
        <Route path="/manager/employees" element={<ManagerPage component={Employees} />} />
        <Route path="/manager/holidays" element={<ManagerPage component={ManagerHolidays} />} />
        <Route path="/manager/leaves" element={<ManagerPage component={ManagerLeaves} />} />
        <Route path="/manager/attendance" element={<ManagerPage component={ManagerAttendance} />} />
        <Route path="/manager/expenses" element={<ManagerPage component={ManagerExpenses} />} />
        <Route path="/manager/salary" element={<ManagerPage component={SalaryManagement} />} />
        <Route path="/manager/messages" element={<ManagerPage component={ManagerMessages} />} />
        <Route path="/manager/policies" element={<ManagerPage component={ManagerPolicies} />} />
        <Route path="/manager/settings" element={<ManagerPage component={ManagerSettings} />} />
        <Route path="/manager/offboarding" element={<ManagerPage component={Offboarding} />} />
        <Route path="/manager/letters" element={<ManagerPage component={Letters} />} />

        {/* Manager self */}
        <Route path="/manager/self/dashboard" element={<ManagerPage component={SelfDashboard} />} />
        <Route path="/manager/self/holidays" element={<ManagerPage component={SelfHolidays} />} />
        <Route path="/manager/self/leaves" element={<ManagerPage component={SelfLeaves} />} />
        <Route path="/manager/self/attendance" element={<ManagerPage component={SelfAttendance} />} />
        <Route path="/manager/self/expenses" element={<ManagerPage component={SelfExpenses} />} />
        <Route path="/manager/self/policies" element={<ManagerPage component={SelfPolicies} />} />
        <Route path="/manager/self/profile" element={<ManagerPage component={SelfProfile} />} />
        <Route path="/manager/self/salary" element={<ManagerPage component={SelfSalary} />} />
        <Route path="/manager/self/letters" element={<ManagerPage component={SelfLetters} />} />
        <Route path="/manager/self/offboarding" element={<ManagerPage component={SelfOffboarding} />} />

        {/* Employee */}
        <Route path="/employee/dashboard" element={<EmployeePage component={EmployeeDashboard} />} />
        <Route path="/employee/leaves" element={<EmployeePage component={EmployeeLeaves} />} />
        <Route path="/employee/holidays" element={<EmployeePage component={EmployeeHolidays} />} />
        <Route path="/employee/attendance" element={<EmployeePage component={EmployeeAttendance} />} />
        <Route path="/employee/expenses" element={<EmployeePage component={EmployeeExpenses} />} />
        <Route path="/employee/policies" element={<EmployeePage component={EmployeePolicies} />} />
        <Route path="/employee/chat" element={<EmployeePage component={EmployeeChat} />} />
        <Route path="/employee/profile" element={<EmployeePage component={EmployeeProfile} />} />
        <Route path="/employee/settings" element={<EmployeePage component={EmployeeSettings} />} />
        <Route path="/employee/salary" element={<EmployeePage component={EmployeeSalary} />} />
        <Route path="/employee/letters" element={<EmployeePage component={EmployeeLetters} />} />
        <Route path="/employee/offboarding" element={<EmployeePage component={EmployeeOffboarding} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// routes served on main site (shnoor.com, localhost)
function MainSiteRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/superadmin/login" element={<GuestRoute><SuperAdminLoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<Terms />} />

        {/* SuperAdmin */}
        <Route path="/superadmin/dashboard" element={<SuperAdminPage component={SuperAdminDashboard} />} />
        <Route path="/superadmin/companies" element={<SuperAdminPage component={Companies} />} />
        <Route path="/superadmin/subscriptions" element={<SuperAdminPage component={Subscriptions} />} />
        <Route path="/superadmin/transactions" element={<SuperAdminPage component={Transactions} />} />
        <Route path="/superadmin/admin-management" element={<SuperAdminPage component={AdminManagement} />} />
        <Route path="/superadmin/contact-queries" element={<SuperAdminPage component={ContactQueries} />} />
        <Route path="/superadmin/website-settings" element={<SuperAdminPage component={WebsiteSettings} />} />
        <Route path="/superadmin/settings" element={<SuperAdminPage component={SuperAdminSettings} />} />
        <Route path="/superadmin/profile" element={<SuperAdminPage component={SuperAdminProfile} />} />
        <Route path="/superadmin/clients" element={<SuperAdminPage component={Clients} />} />
        <Route path="/superadmin/subdomain-requests" element={<SuperAdminPage component={SubdomainRequests} />} />
        <Route path="/superadmin/payment-gateways" element={<SuperAdminPage component={PaymentGateways} />} />
        <Route path="/superadmin/invoices" element={<SuperAdminPage component={Invoices} />} />

        {/* Client Area */}
        <Route path="/client/dashboard" element={<ClientPage component={ClientDashboard} />} />
        <Route path="/client/managers" element={<ClientPage component={Staff} />} />
        <Route path="/client/plan" element={<ClientPage component={CurrentPlan} />} />
        <Route path="/client/usage" element={<ClientPage component={Usage} />} />
        <Route path="/client/settings" element={<ClientPage component={ClientSettings} />} />
        <Route path="/client/billings" element={<ClientPage component={Billings} />} />
        <Route path="/client/support" element={<ClientPage component={Support} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// reads subdomain and serves the correct route tree
function AppRoutes() {
  const { isCompany } = useSubdomain()
  if (isCompany) return <CompanyRoutes />
  return <MainSiteRoutes />
}

export default AppRoutes