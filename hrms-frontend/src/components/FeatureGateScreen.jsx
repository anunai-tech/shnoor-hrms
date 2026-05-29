export default function FeatureGateScreen({ featureName, requiredPlan = 'Pro' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <h2 className="font-display text-xl font-bold text-gray-800 mb-2">{featureName} Not Available</h2>
      <p className="font-body text-sm text-gray-500 mb-1 max-w-sm">
        This feature is not included in your current plan.
      </p>
      <p className="font-body text-sm text-amber-600 font-medium mb-6">
        Upgrade to {requiredPlan} to unlock it.
      </p>
      <a href="/client/billings"
        className="font-display bg-amber-400 hover:bg-amber-500 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition">
        View Plans
      </a>
    </div>
  )
}