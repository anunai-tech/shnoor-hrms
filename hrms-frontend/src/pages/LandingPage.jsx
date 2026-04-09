import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const features = [
  { title: 'Employee Management', description: 'Manage your entire workforce in one place. Add employees, track departments, and maintain complete profiles effortlessly.' },
  { title: 'Attendance Tracking', description: 'Simple clock in/out system. Track working hours, late arrivals, and absences with real-time accuracy.' },
  { title: 'Leave Management', description: 'Streamline leave requests and approvals. Employees apply online, managers approve instantly.' },
  { title: 'Expense Management', description: 'Submit and approve expense claims digitally. No more paper receipts or manual reimbursements.' },
  { title: 'Company Policies', description: 'Centralize all company policies in one accessible location. Keep your team informed and aligned.' },
  { title: 'Multi-Company Support', description: 'Built for scale. Manage multiple companies under one platform with complete data isolation.' },
]

const plans = [
  {
    name: 'Basic', monthly: 0, annual: 0, maxUsers: 50,
    features: ['Up to 50 employees', 'Attendance tracking', 'Leave management', 'Basic reports', 'Email support'],
    highlighted: false, cta: 'Get Started Free',
  },
  {
    name: 'Pro', monthly: 499, annual: 3500, maxUsers: 50,
    features: ['Up to 50 employees', 'All Basic features', 'Expense management', 'Company policies', 'Priority support'],
    highlighted: true, cta: 'Start Pro Plan',
  },
  {
    name: 'Enterprise', monthly: 3500, annual: 30000, maxUsers: 1000,
    features: ['Up to 1000 employees', 'All Pro features', 'Multi-company support', 'Custom integrations', 'Dedicated support'],
    highlighted: false, cta: 'Contact Sales',
  },
]

function LandingPage() {
  const navigate = useNavigate()
  const homeRef = useRef(null)
  const featuresRef = useRef(null)
  const pricingRef = useRef(null)
  const contactRef = useRef(null)

  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [contactSubmitted, setContactSubmitted] = useState(false)
  const [contactLoading, setContactLoading] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState('monthly')

  // ── Dynamic website settings ───────────────────────────
  const [settings, setSettings] = useState({
    hero_title: 'Next Generation HR Management For Your Company',
    hero_subtitle: 'Best-rated HR management application for small to large scale business. Manage employees, attendance, leaves, payroll, and more — all in one place.',
    cta_button_text: 'Get Started Free',
    cta_button_link: '/login',
    contact_email: 'info@shnoorintl.com',
    contact_phone: '+91 98765 43210',
    footer_text: '© 2026 SHNOOR INTERNATIONAL LLC. All rights reserved.',
    logo_url: null,
  })

  useEffect(() => {
    axios.get('http://localhost:5000/api/v1/public/website-settings')
      .then(res => {
        if (res.data && res.data.data) {
          // Merge — only override fields that have real values in DB
          const db = res.data.data
          setSettings(prev => ({
            ...prev,
            ...(db.hero_title        && { hero_title: db.hero_title }),
            ...(db.hero_subtitle     && { hero_subtitle: db.hero_subtitle }),
            ...(db.cta_button_text   && { cta_button_text: db.cta_button_text }),
            ...(db.cta_button_link   && { cta_button_link: db.cta_button_link }),
            ...(db.contact_email     && { contact_email: db.contact_email }),
            ...(db.contact_phone     && { contact_phone: db.contact_phone }),
            ...(db.footer_text       && { footer_text: db.footer_text }),
            ...(db.logo_url          && { logo_url: db.logo_url }),
          }))
        }
      })
      .catch(() => {}) // silently use defaults
  }, [])
  // ────────────────────────────────────────────────────────

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth' })
  const handleContactChange = (e) => setContactForm({ ...contactForm, [e.target.name]: e.target.value })

  const handleContactSubmit = async (e) => {
    e.preventDefault()
    setContactLoading(true)
    try {
      await axios.post('http://localhost:5000/api/v1/public/contact', contactForm)
    } catch (err) {}
    finally {
      setContactSubmitted(true)
      setContactLoading(false)
      setContactForm({ name: '', email: '', subject: '', message: '' })
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-800">

      {/* ── NAVBAR ─────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollTo(homeRef)}>
            <img src={settings.logo_url || '/shnoor-logo.png'} alt="SHNOOR" className="h-9 w-auto object-contain" />
            <span className="text-gray-800 font-bold text-base hidden sm:block">SHNOOR INTERNATIONAL LLC</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {[{ label: 'Home', ref: homeRef }, { label: 'Features', ref: featuresRef }, { label: 'Pricing', ref: pricingRef }, { label: 'Contact', ref: contactRef }].map(item => (
              <button key={item.label} onClick={() => scrollTo(item.ref)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition font-medium">
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/login')}
              className="text-sm font-medium text-gray-600 hover:text-gray-900 transition px-4 py-2">
              Login
            </button>
            <button onClick={() => navigate(settings.cta_button_link || '/login')}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition">
              {settings.cta_button_text}
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ───────────────────────── */}
      <section ref={homeRef} className="pt-28 pb-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-block bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                HR Management Software
              </div>
              <h1 className="text-5xl font-black text-gray-900 leading-tight mb-6">
                {settings.hero_title}
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-8">
                {settings.hero_subtitle}
              </p>
              <div className="flex gap-4">
                <button onClick={() => navigate(settings.cta_button_link || '/login')}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg text-sm transition flex items-center gap-2">
                  {settings.cta_button_text} →
                </button>
                <button onClick={() => scrollTo(featuresRef)}
                  className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-6 py-3 rounded-lg text-sm transition">
                  View Features
                </button>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <div className="flex justify-center mb-6">
                <img src={settings.logo_url || '/shnoor-logo.png'} alt="SHNOOR" className="h-16 w-auto object-contain" />
              </div>
              <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">HR Dashboard Overview</p>
              <div className="grid grid-cols-2 gap-4">
                {[{ label: 'Companies', value: '500+' }, { label: 'Employees', value: '50K+' }, { label: 'Uptime', value: '99.9%' }, { label: 'Support', value: '24/7' }].map(stat => (
                  <div key={stat.label} className="bg-gray-50 rounded-xl p-5 text-center">
                    <p className="text-2xl font-black text-blue-600">{stat.value}</p>
                    <p className="text-xs text-gray-400 mt-1 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES SECTION ───────────────────── */}
      <section ref={featuresRef} className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">Everything You Need To<br />Manage Your Team</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm">A complete suite of HR tools designed to save time, reduce paperwork, and keep your team happy.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="border border-gray-200 rounded-2xl p-6 hover:border-blue-300 hover:shadow-sm transition-all duration-300">
                <h3 className="text-gray-900 font-bold text-base mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ────────────────────── */}
      <section ref={pricingRef} className="py-24 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-gray-500 max-w-xl mx-auto text-sm mb-8">Choose the plan that works for your company. No hidden fees, no surprises.</p>
            <div className="inline-flex items-center bg-white border border-gray-200 rounded-xl p-1">
              <button onClick={() => setBillingPeriod('monthly')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${billingPeriod === 'monthly' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                Monthly
              </button>
              <button onClick={() => setBillingPeriod('annual')}
                className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${billingPeriod === 'annual' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}>
                Annual <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Save 40%</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div key={plan.name}
                className={`rounded-2xl p-8 border transition-all duration-300 ${plan.highlighted ? 'bg-blue-600 border-blue-600 shadow-lg scale-105' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'}`}>
                <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${plan.highlighted ? 'text-blue-100' : 'text-blue-600'}`}>{plan.name}</p>
                <div className="mb-6">
                  <span className={`text-4xl font-black ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                    ₹{billingPeriod === 'monthly' ? plan.monthly.toLocaleString('en-IN') : plan.annual.toLocaleString('en-IN')}
                  </span>
                  <span className={`text-sm ml-2 ${plan.highlighted ? 'text-blue-200' : 'text-gray-400'}`}>/{billingPeriod === 'monthly' ? 'month' : 'year'}</span>
                </div>
                <p className={`text-xs mb-6 ${plan.highlighted ? 'text-blue-100' : 'text-gray-400'}`}>Up to {plan.maxUsers} employees</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3">
                      <span className={`text-sm ${plan.highlighted ? 'text-blue-200' : 'text-blue-500'}`}>✓</span>
                      <span className={`text-sm ${plan.highlighted ? 'text-white' : 'text-gray-600'}`}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate('/login')}
                  className={`w-full py-3 rounded-xl text-sm font-bold transition ${plan.highlighted ? 'bg-white text-blue-600 hover:bg-blue-50' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT SECTION ────────────────────── */}
      <section ref={contactRef} className="py-24 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3">Contact</p>
            <h2 className="text-4xl font-black text-gray-900 mb-4">Get In Touch</h2>
            <p className="text-gray-500 text-sm">Have questions about SHNOOR HRMS? We'd love to hear from you.</p>
            <div className="flex justify-center gap-8 mt-4">
              <p className="text-sm text-gray-500">📧 {settings.contact_email}</p>
              <p className="text-sm text-gray-500">📞 {settings.contact_phone}</p>
            </div>
          </div>
          {contactSubmitted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
              <p className="text-4xl mb-4">🎉</p>
              <h3 className="text-gray-800 font-bold text-xl mb-2">Message Sent!</h3>
              <p className="text-gray-500 text-sm">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
              <button onClick={() => setContactSubmitted(false)} className="mt-6 text-blue-600 text-sm hover:underline font-medium">Send another message</button>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="bg-gray-50 border border-gray-200 rounded-2xl p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input name="name" value={contactForm.name} onChange={handleContactChange} placeholder="Your name" required
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input name="email" type="email" value={contactForm.email} onChange={handleContactChange} placeholder="you@company.com" required
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                <input name="subject" value={contactForm.subject} onChange={handleContactChange} placeholder="What's this about?" required
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                <textarea name="message" value={contactForm.message} onChange={handleContactChange} placeholder="Tell us more..." required rows={5}
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              </div>
              <button type="submit" disabled={contactLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3.5 rounded-xl text-sm transition">
                {contactLoading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────── */}
      <footer className="bg-white border-t border-gray-200 pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={settings.logo_url || '/shnoor-logo.png'} alt="SHNOOR" className="h-10 w-auto object-contain" />
                <span className="font-bold text-gray-800 text-sm">SHNOOR INTERNATIONAL LLC</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">HR management software for attendance, leave tracking, payroll, and employee records.</p>
            </div>
            <div>
              <h4 className="text-gray-800 font-bold text-sm mb-4">Product</h4>
              <ul className="space-y-3">
                {['Features', 'Pricing', 'Contact'].map(item => (
                  <li key={item}>
                    <button onClick={() => scrollTo(item === 'Features' ? featuresRef : item === 'Pricing' ? pricingRef : contactRef)}
                      className="text-gray-400 hover:text-gray-700 text-sm transition">{item}</button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-gray-800 font-bold text-sm mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><button onClick={() => navigate('/privacy-policy')} className="text-gray-400 hover:text-gray-700 text-sm transition">Privacy Policy</button></li>
                <li><button onClick={() => navigate('/terms')} className="text-gray-400 hover:text-gray-700 text-sm transition">Terms & Conditions</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-gray-800 font-bold text-sm mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="text-gray-400 text-sm">{settings.contact_email}</li>
                <li className="text-gray-400 text-sm">{settings.contact_phone}</li>
                <li className="text-gray-400 text-sm">Mon – Fri, 9:00 AM – 6:00 PM</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">{settings.footer_text}</p>
            <div className="flex gap-6">
              <button onClick={() => navigate('/privacy-policy')} className="text-gray-400 hover:text-gray-700 text-sm transition">Privacy Policy</button>
              <button onClick={() => navigate('/terms')} className="text-gray-400 hover:text-gray-700 text-sm transition">Terms & Conditions</button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default LandingPage