import { useNavigate } from 'react-router-dom'

function Terms() {
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
          <h1 className="font-display text-4xl font-black text-gray-900 mb-4">Terms & Conditions</h1>
          <p className="font-body text-gray-500 text-sm">Last updated: April 08, 2026</p>
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="font-body text-sm text-blue-700">Please read these Terms and Conditions carefully before using the SHNOOR HRMS platform. By accessing or using our Service, you agree to be bound by these terms. If you disagree with any part of these terms, you may not access the Service.</p>
          </div>
        </div>
        {[
          { title: '1. Acceptance of Terms', content: 'By accessing and using SHNOOR HRMS, you accept and agree to be bound by these Terms and Conditions and our Privacy Policy. These terms apply to all users of the platform, including administrators, managers, and employees.' },
          { title: '2. Use of the Service', content: 'SHNOOR HRMS is provided for legitimate business HR management purposes only. You agree not to use the service for any unlawful purpose, to violate any regulations, or to infringe on the rights of others. Unauthorized access or misuse of the platform is strictly prohibited.' },
          { title: '3. User Accounts', content: 'You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account. We reserve the right to terminate accounts that violate these terms.' },
          { title: '4. Data Ownership', content: 'You retain ownership of all data you input into the platform. By using our service, you grant us a limited license to store, process, and display your data solely for the purpose of providing the service. We do not claim ownership of your organizational data.' },
          { title: '5. Service Availability', content: 'We strive to maintain high availability of our services but do not guarantee uninterrupted access. We may perform scheduled maintenance or experience unexpected downtime. We will make reasonable efforts to minimize disruptions.' },
          { title: '6. Subscription and Payment', content: 'Paid subscription plans are billed as described on our pricing page. Subscriptions auto-renew unless cancelled. Refunds are handled on a case-by-case basis. We reserve the right to modify pricing with reasonable notice.' },
          { title: '7. Intellectual Property', content: 'The SHNOOR HRMS platform, including its design, code, and content, is the intellectual property of SHNOOR INTERNATIONAL LLC. You may not copy, modify, distribute, or reverse engineer any part of the platform without explicit written permission.' },
          { title: '8. Limitation of Liability', content: 'To the maximum extent permitted by law, SHNOOR INTERNATIONAL LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the service, even if we have been advised of the possibility of such damages.' },
          { title: '9. Termination', content: 'We reserve the right to suspend or terminate your access to the service at any time for violations of these terms. Upon termination, your right to use the service ceases immediately, and we may delete your data in accordance with our data retention policy.' },
          { title: '10. Governing Law', content: 'These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in the applicable jurisdiction.' },
          { title: '11. Changes to Terms', content: 'We reserve the right to modify these Terms and Conditions at any time. Changes will be effective upon posting to the platform. Continued use of the service after changes constitutes acceptance of the new terms.' },
          { title: '12. Contact', content: 'For questions regarding these Terms and Conditions, please contact us at support@shnoor.com.' },
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

export default Terms