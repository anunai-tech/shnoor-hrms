import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import ThemeSwitcher from '../components/ThemeSwitcher'

const features = [
  { title: 'Employee Management', description: 'Manage your entire workforce in one place. Add employees, track departments, and maintain complete profiles effortlessly.' },
  { title: 'Attendance Tracking', description: 'Simple clock in/out system. Track working hours, late arrivals, and absences with real-time accuracy.' },
  { title: 'Leave Management', description: 'Streamline leave requests and approvals. Employees apply online, managers approve instantly.' },
  { title: 'Expense Management', description: 'Submit and approve expense claims digitally. No more paper receipts or manual reimbursements.' },
  { title: 'Company Policies', description: 'Centralize all company policies in one accessible location. Keep your team informed and aligned.' },
  { title: 'Multi-Company Support', description: 'Built for scale. Manage multiple companies under one platform with complete data isolation.' },
]

// Fallback plan features shown if DB doesn't have them yet (pre-migration safety net).
const PLAN_FEATURE_DEFAULTS = {
  Basic: {
    features: ['Up to 50 employees', 'Attendance tracking', 'Leave management', 'Basic reports', 'Email support'],
    highlighted: false,
    cta: 'Get Started Free',
  },
  Pro: {
    features: ['Up to 50 employees', 'All Basic features', 'Expense management', 'Company policies', 'Priority support'],
    highlighted: true,
    cta: 'Start Pro Plan',
  },
  Enterprise: {
    features: ['Up to 1000 employees', 'All Pro features', 'Multi-company support', 'Custom integrations', 'Dedicated support'],
    highlighted: false,
    cta: 'Contact Sales',
  },
}

const faqs = [
  { question: 'What is SHNOOR HRMS?', answer: 'SHNOOR HRMS is a full-featured Human Resource Management System built for businesses of all sizes. It covers employee management, attendance tracking, leave management, payroll, expense claims, company policies, and more — all in one unified platform.' },
  { question: 'How much does it cost?', answer: 'We offer three plans — Basic (free), Pro, and Enterprise. Please check our Pricing section above for current pricing. Plans differ in employee limits, features, and support levels.' },
  { question: 'Is there a free plan?', answer: 'Yes! Our Basic plan is free forever with no credit card required. It supports up to 50 employees and includes attendance tracking, leave management, and basic reporting — a great starting point for small teams.' },
  { question: 'How many employees can I manage?', answer: 'Our plans support different employee limits. Check the Pricing section above for the latest limits per plan. The Enterprise plan also supports managing multiple companies under one account.' },
  { question: 'What features are included?', answer: 'SHNOOR HRMS includes employee profiles, attendance clock-in/out, leave applications and approvals, expense submissions, salary management with payslip generation, company policy documents, offboarding workflows, and a dynamic public landing page — all manageable from a clean dashboard.' },
  { question: 'How do I get started?', answer: 'Getting started is simple. Reach out to us through the Contact form below — our team will set up your company account and provide login credentials to your designated HR Manager. From there, your manager can onboard employees, configure salary structures, and begin operations immediately.' },
  { question: 'Is my data secure?', answer: "Absolutely. SHNOOR HRMS uses JWT-based authentication, bcrypt password hashing, and role-based access control to ensure only authorised users can access data. Each company's data is fully isolated — no cross-company data access is possible." },
  { question: 'Can I manage multiple companies?', answer: 'Yes, the Enterprise plan supports full multi-company management. The SHNOOR Superadmin can onboard multiple companies, each with their own manager, employees, and completely isolated data — all managed from a single platform.' },
  { question: 'How long does setup take?', answer: 'Setup is very fast. Once you contact us, your company account is typically activated within one business day. Your HR Manager can then log in and start adding employees and configuring the system immediately — no technical expertise required.' },
  { question: 'How do I contact support?', answer: null },
]
function FAQChatbot({ onContactClick }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [showQuestions, setShowQuestions] = useState(true)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{ from: 'bot', text: "Hello! I'm the SHNOOR virtual assistant. Select a question below and I'll do my best to help you." }])
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [messages, isOpen])

  const handleQuestion = (faq) => {
    const userMsg = { from: 'user', text: faq.question }
    if (!faq.answer) {
      setMessages(prev => [...prev, userMsg, { from: 'bot', text: "I'd be happy to connect you with our team directly.", isContact: true }])
    } else {
      setMessages(prev => [...prev, userMsg, { from: 'bot', text: faq.answer }])
    }
    setShowQuestions(false)
  }

  const handleReset = () => {
    setShowQuestions(true)
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-105"
        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
        aria-label="Open chat assistant">
        {isOpen ? (
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
          </svg>
        )}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '520px', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.6)', boxShadow: '0 25px 50px rgba(0,0,0,0.15), 0 0 0 1px rgba(255,255,255,0.5) inset' }}>

          <div className="px-5 py-4 flex items-center justify-between flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 overflow-hidden p-0.5">
                <img src="/shnoor-logo.png" alt="SHNOOR" className="w-full h-full object-contain" />
              </div>
              <div>
                <p className="font-display text-white font-semibold text-sm leading-tight">SHNOOR Assistant</p>
                <p className="font-body text-secondary text-xs">Always here to help</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="font-body text-secondary text-xs">Online</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ maxHeight: '320px' }}>
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.from === 'bot' && (
                  <div className="w-6 h-6 rounded-full flex-shrink-0 mr-2 mt-0.5 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}>
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2a5 5 0 015 5v2a5 5 0 01-10 0V7a5 5 0 015-5zm-7 16a7 7 0 0114 0H5z" />
                    </svg>
                  </div>
                )}
                <div>
                  <div className={`font-body px-4 py-2.5 rounded-2xl text-sm leading-relaxed max-w-xs ${msg.from === 'user' ? 'text-white rounded-tr-sm' : 'text-gray-800 rounded-tl-sm'}`}
                    style={msg.from === 'user'
                      ? { background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }
                      : { background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)' }}>
                    {msg.text}
                    {msg.isContact && (
                      <button onClick={() => { onContactClick(); setIsOpen(false) }}
                        className="font-display mt-2 flex items-center gap-1.5 text-primary font-semibold text-xs hover:opacity-70 transition">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Contact our team
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="px-4 py-3 flex-shrink-0 border-t space-y-2"
            style={{ borderColor: 'rgba(0,0,0,0.06)', background: 'rgba(248,250,252,0.9)' }}>
            {showQuestions ? (
              <>
                <p className="font-display text-xs text-gray-400 font-medium mb-2">Select a question</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {faqs.map((faq, i) => (
                    <button key={i} onClick={() => handleQuestion(faq)}
                      className="font-display w-full text-left text-xs text-gray-700 px-3 py-2 rounded-lg border transition-all duration-150 font-medium hover:text-primary hover:border-primary hover:bg-secondary/20"
                      style={{ borderColor: 'rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.8)' }}>
                      {faq.question}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <button onClick={handleReset}
                  className="font-display w-full text-xs font-semibold py-2 rounded-lg border transition-all hover:bg-secondary/20 hover:text-primary hover:border-primary text-gray-600"
                  style={{ borderColor: 'rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.8)' }}>
                  Ask another question
                </button>
                <button onClick={() => { onContactClick(); setIsOpen(false) }}
                  className="font-display w-full text-xs font-semibold py-2 rounded-lg text-quaternary transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}>
                  Still need help? Contact us
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

function LandingPage() {
  const navigate = useNavigate()
  const homeRef = useRef(null)
  const featuresRef = useRef(null)
  // Plans fetched from DB — prices stay in sync when superadmin updates them.
  const [plans, setPlans] = useState([])
  const pricingRef = useRef(null)
  const contactRef = useRef(null)

  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [contactSubmitted, setContactSubmitted] = useState(false)
  const [contactLoading, setContactLoading] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState('monthly')

  const [settings, setSettings] = useState({
    hero_title: 'Next Generation HR Management For Your Company',
    hero_subtitle: 'Best-rated HR management application for small to large scale business. Manage employees, attendance, leaves, payroll, and more — all in one place.',
    cta_button_text: 'Get Started Free',
    cta_button_link: '/register',
    contact_email: 'info@shnoorintl.com',
    contact_phone: '+91 98765 43210',
    footer_text: '© 2026 SHNOOR INTERNATIONAL LLC. All rights reserved.',
    logo_url: null,
  })

  // Fetch live subscription plans from DB on mount.
  useEffect(() => {
    api.get('/public/plans')
      .then(res => setPlans(res.data.data || []))
      .catch(() => { })
  }, [])

  useEffect(() => {
    api.get('/public/website-settings')
      .then(res => {
        if (res.data && res.data.data) {
          const db = res.data.data
          setSettings(prev => ({
            ...prev,
            ...(db.hero_title && { hero_title: db.hero_title }),
            ...(db.hero_subtitle && { hero_subtitle: db.hero_subtitle }),
            ...(db.cta_button_text && { cta_button_text: db.cta_button_text }),
            ...(db.cta_button_link && { cta_button_link: db.cta_button_link }),
            ...(db.contact_email && { contact_email: db.contact_email }),
            ...(db.contact_phone && { contact_phone: db.contact_phone }),
            ...(db.footer_text && { footer_text: db.footer_text }),
            ...(db.logo_url && { logo_url: db.logo_url }),
          }))
        }
      })
      .catch(() => { })
  }, [])

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth' })
  const handleContactChange = (e) => setContactForm({ ...contactForm, [e.target.name]: e.target.value })

  const handleContactSubmit = async (e) => {
    e.preventDefault()
    setContactLoading(true)
    try {
      await api.post('/public/contact', contactForm)
    } catch (err) { }
    finally {
      setContactSubmitted(true)
      setContactLoading(false)
      setContactForm({ name: '', email: '', subject: '', message: '' })
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-800">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => scrollTo(homeRef)}>
            <img src={settings.logo_url || '/shnoor-logo.png'} alt="SHNOOR" className="h-9 w-auto object-contain" />
            <span className="font-display text-gray-800 font-bold text-base hidden sm:block">SHNOOR INTERNATIONAL LLC</span>
          </div>
          <div className="hidden md:flex items-center gap-1">
            {[{ label: 'Home', ref: homeRef }, { label: 'Features', ref: featuresRef }, { label: 'Pricing', ref: pricingRef }, { label: 'Contact', ref: contactRef }].map(item => (
              <button key={item.label} onClick={() => scrollTo(item.ref)}
                className="font-display px-4 py-2 text-sm text-gray-600 hover:text-tertiary hover:bg-gray-100 rounded-lg transition font-medium">
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <button onClick={() => navigate('/login')}
              className="font-display text-sm font-medium text-gray-600 hover:text-gray-900 transition px-4 py-2">
              Login
            </button>
            <button onClick={() => navigate('/register')}
              className="font-display bg-primary hover:opacity-90 text-quaternary text-sm font-semibold px-5 py-2 rounded-lg transition">
              {settings.cta_button_text}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section ref={homeRef} className="pt-20 sm:pt-28 pb-12 sm:pb-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <div>
              <div className="font-display inline-block bg-secondary/30 border border-secondary text-primary text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
                HR Management Software
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 leading-tight mb-6">
                {settings.hero_title}
              </h1>
              <p className="font-body text-gray-500 text-sm leading-relaxed mb-8">
                {settings.hero_subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => navigate(settings.cta_button_link || '/login')}
                  className="font-display bg-primary hover:opacity-90 text-quaternary font-bold px-6 py-3 rounded-lg text-sm transition flex items-center gap-2">
                  {settings.cta_button_text} →
                </button>
                <button onClick={() => scrollTo(featuresRef)}
                  className="font-display border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-6 py-3 rounded-lg text-sm transition">
                  View Features
                </button>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
              <div className="flex justify-center mb-6">
                <img src={settings.logo_url || '/shnoor-logo.png'} alt="SHNOOR" className="h-16 w-auto object-contain" />
              </div>
              <p className="font-display text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">HR Dashboard Overview</p>
              <div className="grid grid-cols-2 gap-4">
                {[{ label: 'Companies', value: '500+' }, { label: 'Employees', value: '50K+' }, { label: 'Uptime', value: '99.9%' }, { label: 'Support', value: '24/7' }].map(stat => (
                  <div key={stat.label} className="bg-gray-50 rounded-xl p-5 text-center">
                    <p className="font-display text-2xl font-black text-primary">{stat.value}</p>
                    <p className="font-body text-xs text-gray-400 mt-1 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section ref={featuresRef} className="py-12 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="font-display text-primary text-sm font-semibold uppercase tracking-widest mb-3">Features</p>
            <h2 className="font-display text-2xl sm:text-4xl font-black text-gray-900 mb-4">Everything You Need To<br className="hidden sm:block" /> Manage Your Team</h2>
            <p className="font-body text-gray-500 max-w-xl mx-auto text-sm">A complete suite of HR tools designed to save time, reduce paperwork, and keep your team happy.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="border border-gray-200 rounded-2xl p-6 hover:border-primary hover:shadow-sm transition-all duration-300">
                <h3 className="font-display text-gray-900 font-bold text-base mb-2">{feature.title}</h3>
                <p className="font-body text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section ref={pricingRef} className="py-12 sm:py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-display text-primary text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="font-display text-2xl sm:text-4xl font-black text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="font-body text-gray-500 max-w-xl mx-auto text-sm mb-8">Choose the plan that works for your company. No hidden fees, no surprises.</p>
            <div className="inline-flex items-center bg-white border border-gray-200 rounded-xl p-1">
              <button onClick={() => setBillingPeriod('monthly')}
                className={`font-display px-5 py-2 rounded-lg text-sm font-semibold transition ${billingPeriod === 'monthly' ? 'bg-primary text-quaternary' : 'text-gray-500 hover:text-gray-700'}`}>
                Monthly
              </button>
              <button onClick={() => setBillingPeriod('annual')}
                className={`font-display px-5 py-2 rounded-lg text-sm font-semibold transition ${billingPeriod === 'annual' ? 'bg-primary text-quaternary' : 'text-gray-500 hover:text-gray-700'}`}>
                Annual <span className="font-body ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Save 40%</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {plans.map((plan) => {
              // Resolve display values — use DB fields, fall back to defaults if migration not yet run.
              const isHighlighted = plan.is_highlighted ?? PLAN_FEATURE_DEFAULTS[plan.name]?.highlighted ?? false
              const planFeatures = plan.features || PLAN_FEATURE_DEFAULTS[plan.name]?.features || []
              const planCta = plan.cta_text || PLAN_FEATURE_DEFAULTS[plan.name]?.cta || 'Get Started'
              const price = billingPeriod === 'monthly'
                ? Number(plan.monthly_price)
                : Number(plan.annual_price)

              return (
                <div key={plan.name}
                  className={`rounded-2xl p-8 border transition-all duration-300 ${isHighlighted ? 'bg-primary border-primary shadow-lg scale-105' : 'bg-white border-gray-200 hover:border-primary hover:shadow-sm'}`}>
                  <p className={`font-display text-xs font-bold uppercase tracking-widest mb-3 ${isHighlighted ? 'text-quaternary' : 'text-primary'}`}>{plan.name}</p>
                  <div className="mb-6">
                    <span className={`font-display text-4xl font-black ${isHighlighted ? 'text-quaternary' : 'text-gray-900'}`}>
                      ₹{price.toLocaleString('en-IN')}
                    </span>
                    <span className={`font-body text-sm ml-2 ${isHighlighted ? 'text-secondary' : 'text-gray-400'}`}>
                      /{billingPeriod === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  <p className={`font-body text-xs mb-6 ${isHighlighted ? 'text-secondary' : 'text-gray-400'}`}>
                    Up to {plan.max_users} employees
                  </p>
                  <ul className="space-y-3 mb-8">
                    {planFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-3">
                        <span className={`font-display text-sm ${isHighlighted ? 'text-secondary' : 'text-primary'}`}>✓</span>
                        <span className={`font-body text-sm ${isHighlighted ? 'text-quaternary' : 'text-gray-600'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => navigate('/register')}
                    className={`font-display w-full py-3 rounded-xl text-sm font-bold transition ${isHighlighted ? 'bg-quaternary text-primary hover:opacity-90' : 'bg-primary text-quaternary hover:opacity-90'}`}>
                    {planCta}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section ref={contactRef} className="py-24 px-6 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-display text-primary text-sm font-semibold uppercase tracking-widest mb-3">Contact</p>
            <h2 className="font-display text-4xl font-black text-gray-900 mb-4">Get In Touch</h2>
            <p className="font-body text-gray-500 text-sm">Have questions about SHNOOR HRMS? We'd love to hear from you.</p>
            <div className="flex justify-center gap-8 mt-4">
              <p className="font-body text-sm text-gray-500">📧 {settings.contact_email}</p>
              <p className="font-body text-sm text-gray-500">📞 {settings.contact_phone}</p>
            </div>
          </div>
          {contactSubmitted ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-10 text-center">
              <p className="text-4xl mb-4">🎉</p>
              <h3 className="font-display text-gray-800 font-bold text-xl mb-2">Message Sent!</h3>
              <p className="font-body text-gray-500 text-sm">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
              <button onClick={() => setContactSubmitted(false)} className="font-display mt-6 text-primary text-sm hover:underline font-medium">Send another message</button>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} className="bg-gray-50 border border-gray-200 rounded-2xl p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="font-display block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                  <input name="name" value={contactForm.name} onChange={handleContactChange} placeholder="Your name" required
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
                <div>
                  <label className="font-display block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                  <input name="email" type="email" value={contactForm.email} onChange={handleContactChange} placeholder="you@company.com" required
                    className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="font-display block text-sm font-medium text-gray-700 mb-1.5">Subject</label>
                <input name="subject" value={contactForm.subject} onChange={handleContactChange} placeholder="What's this about?" required
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" />
              </div>
              <div>
                <label className="font-display block text-sm font-medium text-gray-700 mb-1.5">Message</label>
                <textarea name="message" value={contactForm.message} onChange={handleContactChange} placeholder="Tell us more..." required rows={5}
                  className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none" />
              </div>
              <button type="submit" disabled={contactLoading}
                className="font-display w-full bg-primary hover:opacity-90 disabled:opacity-50 text-quaternary font-bold py-3.5 rounded-xl text-sm transition">
                {contactLoading ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 pt-16 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={settings.logo_url || '/shnoor-logo.png'} alt="SHNOOR" className="h-10 w-auto object-contain" />
                <span className="font-display font-bold text-gray-800 text-sm">SHNOOR INTERNATIONAL LLC</span>
              </div>
              <p className="font-body text-gray-400 text-sm leading-relaxed">HR management software for attendance, leave tracking, payroll, and employee records.</p>
            </div>
            <div>
              <h4 className="font-display text-gray-800 font-bold text-sm mb-4">Product</h4>
              <ul className="space-y-3">
                {['Features', 'Pricing', 'Contact'].map(item => (
                  <li key={item}>
                    <button onClick={() => scrollTo(item === 'Features' ? featuresRef : item === 'Pricing' ? pricingRef : contactRef)}
                      className="font-body text-gray-400 hover:text-gray-700 text-sm transition">{item}</button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-display text-gray-800 font-bold text-sm mb-4">Legal</h4>
              <ul className="space-y-3">
                <li><button onClick={() => navigate('/privacy-policy')} className="font-body text-gray-400 hover:text-gray-700 text-sm transition">Privacy Policy</button></li>
                <li><button onClick={() => navigate('/terms')} className="font-body text-gray-400 hover:text-gray-700 text-sm transition">Terms & Conditions</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display text-gray-800 font-bold text-sm mb-4">Contact</h4>
              <ul className="space-y-3">
                <li className="font-body text-gray-400 text-sm">{settings.contact_email}</li>
                <li className="font-body text-gray-400 text-sm">{settings.contact_phone}</li>
                <li className="font-body text-gray-400 text-sm">Mon – Fri, 9:00 AM – 6:00 PM</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-body text-gray-400 text-sm">{settings.footer_text}</p>
            <div className="flex gap-6">
              <button onClick={() => navigate('/privacy-policy')} className="font-body text-gray-400 hover:text-gray-700 text-sm transition">Privacy Policy</button>
              <button onClick={() => navigate('/terms')} className="font-body text-gray-400 hover:text-gray-700 text-sm transition">Terms & Conditions</button>
            </div>
          </div>
        </div>
      </footer>

      <FAQChatbot onContactClick={() => scrollTo(contactRef)} />
    </div>
  )
}

export default LandingPage