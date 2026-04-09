import { useNavigate } from 'react-router-dom'

function Terms() {

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
          <h1 className="text-4xl font-black text-gray-900 mb-4">Terms & Conditions</h1>
          <p className="text-gray-500 text-sm">Last updated: April 08, 2026</p>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-sm text-blue-700">
              Please read these Terms and Conditions carefully before using the SHNOOR HRMS platform.
              By accessing or using our Service, you agree to be bound by these terms.
              If you disagree with any part of these terms, you may not access the Service.
            </p>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-10">

          <Section title="1. Acceptance of Terms">
            <p>By accessing and using the SHNOOR HRMS platform ("Service"), you confirm that:</p>
            <ul>
              <li>You are at least 18 years of age</li>
              <li>You have the legal authority to enter into this agreement</li>
              <li>You are using the Service on behalf of a registered organization</li>
              <li>You agree to comply with all applicable laws and regulations</li>
              <li>You accept these Terms and Conditions in full</li>
            </ul>
          </Section>

          <Section title="2. Description of Service">
            <p>SHNOOR HRMS is a cloud-based Human Resource Management System that provides:</p>
            <ul>
              <li>Employee management and record keeping</li>
              <li>Attendance tracking and management</li>
              <li>Leave application and approval workflows</li>
              <li>Expense management and reimbursement</li>
              <li>Salary and payroll management</li>
              <li>Company policy management</li>
              <li>Offboarding and documentation tools</li>
            </ul>
            <p className="mt-3">We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time with reasonable notice.</p>
          </Section>

          <Section title="3. Account Registration and Security">
            <p>To use our Service:</p>
            <ul>
              <li>Company accounts are created by SHNOOR INTERNATIONAL LLC administrators</li>
              <li>Manager accounts are created by Super Administrators</li>
              <li>Employee accounts are created by their respective Managers</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials</li>
              <li>You must immediately notify us of any unauthorized use of your account</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>Sharing account credentials with others is strictly prohibited</li>
            </ul>
          </Section>

          <Section title="4. Subscription Plans and Payments">
            <SubSection title="4.1 Subscription Tiers">
              <p>We offer the following subscription plans:</p>
              <ul>
                <li><strong>Basic Plan:</strong> Free, up to 50 employees, core features</li>
                <li><strong>Pro Plan:</strong> ₹499/month or ₹3,500/year, up to 50 employees, all features</li>
                <li><strong>Enterprise Plan:</strong> ₹3,500/month or ₹30,000/year, up to 1,000 employees, all features + dedicated support</li>
              </ul>
            </SubSection>
            <SubSection title="4.2 Payment Terms">
              <ul>
                <li>Subscriptions are billed in advance on a monthly or annual basis</li>
                <li>All prices are in Indian Rupees (INR) and inclusive of applicable taxes</li>
                <li>Payments are non-refundable except as required by law</li>
                <li>We reserve the right to change subscription pricing with 30 days notice</li>
                <li>Failure to pay may result in suspension or termination of service</li>
              </ul>
            </SubSection>
          </Section>

          <Section title="5. Data Ownership and Privacy">
            <ul>
              <li>Your company retains full ownership of all data entered into the platform</li>
              <li>We do not sell, share, or use your company data for any purpose other than providing the Service</li>
              <li>You grant us a limited license to store and process your data solely to provide the Service</li>
              <li>Upon termination, you may request a full export of your data within 30 days</li>
              <li>After 30 days post-termination, all data will be permanently deleted</li>
              <li>Our full Privacy Policy governs data handling practices</li>
            </ul>
          </Section>

          <Section title="6. Acceptable Use Policy">
            <p>You agree NOT to use the Service to:</p>
            <ul>
              <li>Violate any applicable laws or regulations</li>
              <li>Upload false, misleading, or fraudulent attendance or payroll records</li>
              <li>Harass, discriminate against, or harm other users</li>
              <li>Attempt to gain unauthorized access to other accounts or systems</li>
              <li>Reverse engineer, decompile, or attempt to extract source code</li>
              <li>Use the platform for any purpose other than HR management</li>
              <li>Upload malicious code, viruses, or harmful content</li>
              <li>Exceed your subscription's employee limits</li>
            </ul>
            <p className="mt-3">Violation of this policy may result in immediate termination of your account without refund.</p>
          </Section>

          <Section title="7. Intellectual Property">
            <ul>
              <li>The SHNOOR HRMS platform, including all software, designs, logos, and content, is owned by SHNOOR INTERNATIONAL LLC</li>
              <li>All intellectual property rights are reserved</li>
              <li>You may not copy, reproduce, or distribute any part of the platform without written permission</li>
              <li>The SHNOOR name and logo are trademarks of SHNOOR INTERNATIONAL LLC</li>
              <li>You retain ownership of all data and content you upload to the platform</li>
            </ul>
          </Section>

          <Section title="8. Service Availability and Uptime">
            <ul>
              <li>We strive to maintain 99.9% uptime for the platform</li>
              <li>Scheduled maintenance will be announced 24 hours in advance</li>
              <li>We are not liable for downtime caused by third-party services or force majeure events</li>
              <li>Service credits may be provided for extended unplanned outages at our discretion</li>
            </ul>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>To the maximum extent permitted by law:</p>
            <ul>
              <li>SHNOOR INTERNATIONAL LLC shall not be liable for any indirect, incidental, or consequential damages</li>
              <li>Our total liability shall not exceed the amount paid by you in the last 3 months</li>
              <li>We are not responsible for data loss due to user error or unauthorized access</li>
              <li>We provide the Service "as is" without warranties of any kind</li>
              <li>We do not guarantee that the Service will be error-free or uninterrupted</li>
            </ul>
          </Section>

          <Section title="10. Termination">
            <SubSection title="10.1 Termination by You">
              <ul>
                <li>You may cancel your subscription at any time from your account settings</li>
                <li>Cancellation takes effect at the end of the current billing period</li>
                <li>No refunds are provided for unused portions of a billing period</li>
              </ul>
            </SubSection>
            <SubSection title="10.2 Termination by Us">
              <ul>
                <li>We may terminate accounts that violate these Terms</li>
                <li>We may terminate accounts for non-payment after reasonable notice</li>
                <li>We will provide 30 days notice for termination without cause</li>
              </ul>
            </SubSection>
          </Section>

          <Section title="11. Governing Law and Disputes">
            <ul>
              <li>These Terms are governed by the laws of India</li>
              <li>Any disputes shall be subject to the jurisdiction of courts in Hyderabad, Telangana</li>
              <li>We encourage resolving disputes through direct communication first</li>
              <li>For unresolved disputes, arbitration under the Arbitration and Conciliation Act, 1996 shall apply</li>
            </ul>
          </Section>

          <Section title="12. Changes to Terms">
            <p>We reserve the right to update these Terms at any time. When we make changes:</p>
            <ul>
              <li>We will update the "Last updated" date at the top of this page</li>
              <li>We will notify administrators via email for significant changes</li>
              <li>Continued use of the Service after changes constitutes acceptance</li>
              <li>If you disagree with updated Terms, you must stop using the Service</li>
            </ul>
          </Section>

          <Section title="13. Contact Information">
            <p>For questions about these Terms and Conditions:</p>
            <div className="mt-4 bg-gray-50 rounded-xl p-5 space-y-2">
              <p className="text-sm text-gray-700"><strong>SHNOOR INTERNATIONAL LLC</strong></p>
              <p className="text-sm text-gray-600">Email: legal@shnoorintl.com</p>
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
            <button onClick={() => navigate('/privacy-policy')}
              className="text-sm text-blue-600 hover:underline">Privacy Policy</button>
          </div>
        </div>

      </div>
    </div>
  )
}

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

export default Terms