const { getCompanyPlanFeatures } = require('../utils/planGating')

// Shared endpoint — works for manager, employee, and client routes
const getMyPlanFeatures = async (req, res) => {
  try {
    const data = await getCompanyPlanFeatures(req.user.company_id)
    if (!data) return res.status(404).json({ success: false, message: 'Plan data not found' })
    res.json({ success: true, data })
  } catch (err) {
    console.error('getMyPlanFeatures error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = { getMyPlanFeatures }