import { useNavigate } from 'react-router-dom'

function PrivacyPolicy() {

  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/shnoor-logo.png" alt="SHNOOR" className="h-8 w-auto object-contain" />
            <span className="font-bold text-gray-800 text-sm">SHNOOR INTERNATIONAL LLC</span>
          </div>
          <button onClick={() => navigate('/')}
            className="text-sm text-gray-500 hover:text-gray-800 transition font-medium">
            ← Back to Home
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-black text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: April 08, 2026</p>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-sm text-blue-700">
              This Privacy Policy describes how SHNOOR INTERNATIONAL LLC ("we", "us", or "our")
              collects, uses, and protects your personal information when you use the SHNOOR HRMS
              platform ("Service"). Please read this policy carefully.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-10">

          <Section title="1. Information We Collect">
            <p>We collect the following types of information when you use our Service:</p>
            <SubSection title="1.1 Personal Information">
              <ul>
                <li>Full name, email address, and phone number</li>
                <li>Job title, department, and employment details</li>
                <li>Date of birth (for birthday notifications)</li>
                <li>Address and contact information</li>
                <li>Profile photographs uploaded by users</li>
              </ul>
            </SubSection>
            <SubSection title="1.2 Employment Data">
              <ul>
                <li>Attendance records including clock-in and clock-out timestamps</li>
                <li>Leave applications and approval history</li>
                <li>Expense claims and reimbursement records</li>
                <li>Salary and payroll information</li>
                <li>Performance and offboarding records</li>
              </ul>
            </SubSection>
            <SubSection title="1.3 Technical Information">
              <ul>
                <li>IP address and browser information</li>
                <li>Device type and operating system</li>
                <li>Log data including pages visited and actions performed</li>
                <li>Cookies and session tokens for authentication</li>
              </ul>
            </SubSection>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use the information we collect for the following purposes:</p>
            <ul>
              <li>To provide and operate the SHNOOR HRMS platform</li>
              <li>To authenticate users and maintain account security</li>
              <li>To process attendance, leave, and payroll data</li>
              <li>To send notifications related to HR activities</li>
              <li>To generate reports and analytics for company management</li>
              <li>To respond to support requests and contact form submissions</li>
              <li>To improve our platform and develop new features</li>
              <li>To comply with legal and regulatory obligations</li>
            </ul>
          </Section>

          <Section title="3. Data Sharing and Disclosure">
            <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
            <ul>
              <li><strong>Within your organization:</strong> Managers can access employee attendance, leave, and expense data within their company. Super Admins can access company-level data.</li>
              <li><strong>Service providers:</strong> We may share data with trusted third-party services (such as email providers) that help us operate the platform, subject to strict confidentiality agreements.</li>
              <li><strong>Legal requirements:</strong> We may disclose information if required by law, court order, or government authority.</li>
              <li><strong>Business transfers:</strong> In the event of a merger or acquisition, user data may be transferred as part of the transaction.</li>
            </ul>
          </Section>

          <Section title="4. Data Security">
            <p>We take the security of your data seriously and implement the following measures:</p>
            <ul>
              <li>All passwords are encrypted using industry-standard bcrypt hashing</li>
              <li>Authentication is handled via secure JWT (JSON Web Tokens)</li>
              <li>All data transmission is encrypted using HTTPS/SSL</li>
              <li>Access to data is role-based — employees can only access their own data</li>
              <li>Database access is restricted to authorized personnel only</li>
              <li>Regular security audits and vulnerability assessments</li>
            </ul>
            <p className="mt-3">Despite our best efforts, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.</p>
          </Section>

          <Section title="5. Data Retention">
            <p>We retain your personal data for as long as your account is active or as needed to provide services. Specifically:</p>
            <ul>
              <li>Active employee records are retained for the duration of employment</li>
              <li>Attendance and payroll records are retained for a minimum of 7 years for legal compliance</li>
              <li>Offboarded employee records are retained for 3 years after offboarding</li>
              <li>Contact form submissions are retained for 1 year</li>
              <li>Account deletion requests will be processed within 30 days</li>
            </ul>
          </Section>

          <Section title="6. Your Rights">
            <p>Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul>
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements</li>
              <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
              <li><strong>Objection:</strong> Object to processing of your data for certain purposes</li>
              <li><strong>Withdrawal of consent:</strong> Withdraw consent where processing is based on consent</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, please contact us at <strong>privacy@shnoorintl.com</strong></p>
          </Section>

          <Section title="7. Cookies">
            <p>We use cookies and similar tracking technologies to:</p>
            <ul>
              <li>Maintain your login session (authentication cookies)</li>
              <li>Remember your preferences</li>
              <li>Analyze platform usage and performance</li>
            </ul>
            <p className="mt-3">You can control cookies through your browser settings. Disabling essential cookies may affect platform functionality.</p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>The SHNOOR HRMS platform is intended for use by adults in a professional employment context. We do not knowingly collect personal information from individuals under 18 years of age. If we become aware that we have collected data from a minor, we will delete it immediately.</p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. When we make significant changes, we will:</p>
            <ul>
              <li>Update the "Last updated" date at the top of this page</li>
              <li>Notify company administrators via email</li>
              <li>Display a notice within the platform</li>
            </ul>
            <p className="mt-3">Continued use of the platform after changes constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="10. Contact Us">
            <p>If you have any questions, concerns, or requests regarding this Privacy Policy, please contact us:</p>
            <div className="mt-4 bg-gray-50 rounded-xl p-5 space-y-2">
              <p className="text-sm text-gray-700"><strong>SHNOOR INTERNATIONAL LLC</strong></p>
              <p className="text-sm text-gray-600">Email: privacy@shnoorintl.com</p>
              <p className="text-sm text-gray-600">Phone: +91 98765 43210</p>
              <p className="text-sm text-gray-600">Hours: Monday – Friday, 9:00 AM – 6:00 PM IST</p>
            </div>
          </Section>

        </div>

        {/* Footer Note */}
        <div className="mt-16 pt-8 border-t border-gray-200 text-center">
          <p className="text-gray-400 text-sm">
            © 2026 SHNOOR INTERNATIONAL LLC. All rights reserved.
          </p>
          <div className="flex justify-center gap-6 mt-4">
            <button onClick={() => navigate('/')}
              className="text-sm text-blue-600 hover:underline">Home</button>
            <button onClick={() => navigate('/terms')}
              className="text-sm text-blue-600 hover:underline">Terms & Conditions</button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ── Helper Components ─────────────────────────
function Section({ title, children }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
        {title}
      </h2>
      <div className="space-y-3 text-gray-600 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  )
}

function SubSection({ title, children }) {
  return (
    <div className="mt-4">
      <h3 className="text-sm font-bold text-gray-800 mb-2">{title}</h3>
      <div className="text-gray-600 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  )
}

export default PrivacyPolicy