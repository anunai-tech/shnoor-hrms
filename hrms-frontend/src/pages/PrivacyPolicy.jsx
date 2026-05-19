import { useNavigate } from 'react-router-dom'

function PrivacyPolicy() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src="/shnoor-logo.png" alt="SHNOOR" className="h-8 w-auto object-contain" />
            <span className="font-display font-bold text-gray-800 text-sm">SHNOOR INTERNATIONAL LLC</span>
          </div>
          <button onClick={() => navigate('/')} className="font-display text-sm text-gray-500 hover:text-gray-800 transition font-medium">← Back to Home</button>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="font-display text-4xl font-black text-gray-900 mb-4">Privacy Policy</h1>
          <p className="font-body text-gray-500 text-sm">Last updated: April 08, 2026</p>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="font-body text-sm text-blue-700">This Privacy Policy describes how SHNOOR INTERNATIONAL LLC ("we", "us", or "our") collects, uses, and protects your personal information when you use the SHNOOR HRMS platform ("Service"). Please read this policy carefully.</p>
          </div>
        </div>
        {[
          { title: '1. Information We Collect', content: 'We collect information you provide directly to us, such as your name, email address, phone number, employment details, and other HR-related data necessary to provide our services. We also collect usage data and technical information about how you interact with our platform.' },
          { title: '2. How We Use Your Information', content: 'We use the collected information to provide, maintain, and improve our HR management services, process payroll and generate payslips, manage attendance and leave records, send administrative communications, comply with legal obligations, and ensure platform security.' },
          { title: '3. Data Sharing and Disclosure', content: 'We do not sell, trade, or rent your personal information to third parties. Within the platform, data is strictly isolated per company — employees of one company cannot access data from another company. We may share data with service providers who assist in operating our platform, subject to confidentiality agreements.' },
          { title: '4. Data Security', content: 'We implement industry-standard security measures including JWT-based authentication, bcrypt password hashing, role-based access control, and encrypted data transmission. However, no method of transmission over the internet is 100% secure.' },
          { title: '5. Data Retention', content: 'We retain your data for as long as your account is active or as needed to provide services. Upon account termination, data may be retained for a reasonable period for legal and business purposes before being securely deleted.' },
          { title: '6. Your Rights', content: 'You have the right to access, correct, or delete your personal information. You may also request a copy of your data or restrict its processing. Contact your company administrator or reach out to us directly to exercise these rights.' },
          { title: '7. Cookies', content: 'Our platform uses minimal cookies for authentication and session management purposes. We do not use tracking cookies or third-party advertising cookies.' },
          { title: '8. Changes to This Policy', content: 'We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date.' },
          { title: '9. Contact Us', content: 'If you have any questions about this Privacy Policy, please contact us at support@shnoor.com or through the contact form on our website.' },
        ].map(({ title, content }) => (
          <div key={title} className="mb-8">
            <h2 className="font-display text-xl font-bold text-gray-900 mb-3">{title}</h2>
            <p className="font-body text-gray-600 text-sm leading-relaxed">{content}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PrivacyPolicy