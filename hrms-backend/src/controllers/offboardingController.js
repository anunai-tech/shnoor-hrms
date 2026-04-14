const pool = require('../config/db')

//  OFFBOARDING REQUESTS 

// Manager — get all offboarding requests for company
const getOffboardingRequests = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, u.first_name, u.last_name, u.designation, u.department, u.email, u.is_active
       FROM offboarding_requests o
       JOIN users u ON u.id = o.employee_id
       WHERE o.company_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Manager — update offboarding status (Approve/Reject/In Progress/Completed)
const updateOffboardingStatus = async (req, res) => {
  try {
    const { status, manager_notes, last_working_day } = req.body
    const result = await pool.query(
      `UPDATE offboarding_requests
       SET status=$1, manager_notes=$2, last_working_day=COALESCE($3, last_working_day), updated_at=NOW()
       WHERE id=$4 AND company_id=$5 RETURNING *`,
      [status, manager_notes || null, last_working_day || null, req.params.id, req.user.company_id]
    )
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Request not found' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Manager — deactivate employee account (FINAL step, separate from offboarding status)
const deactivateEmployee = async (req, res) => {
  try {
    await pool.query(
      `UPDATE users SET is_active=false WHERE id=$1 AND company_id=$2`,
      [req.params.employee_id, req.user.company_id]
    )
    // Also mark all their offboarding requests as Completed
    await pool.query(
      `UPDATE offboarding_requests SET status='Completed', updated_at=NOW()
       WHERE employee_id=$1 AND company_id=$2`,
      [req.params.employee_id, req.user.company_id]
    )
    res.json({ success: true, message: 'Employee account deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Employee — submit resignation
const submitResignation = async (req, res) => {
  try {
    const { reason, last_working_day } = req.body
    // Check if already has a pending/approved resignation
    const existing = await pool.query(
      `SELECT id FROM offboarding_requests 
       WHERE employee_id=$1 AND status IN ('Pending','Approved','In Progress')`,
      [req.user.id]
    )
    if (existing.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'You already have an active offboarding request.' })
    }
    const result = await pool.query(
      `INSERT INTO offboarding_requests (employee_id, company_id, type, reason, last_working_day, status, requested_by)
       VALUES ($1, $2, 'Resignation', $3, $4, 'Pending', 'employee') RETURNING *`,
      [req.user.id, req.user.company_id, reason, last_working_day || null]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Employee — get own offboarding requests
const getMyOffboarding = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM offboarding_requests WHERE employee_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

//  COMPLAINTS 

// Manager — get all complaints for company
const getComplaints = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.*, u.first_name, u.last_name, u.designation, u.department
       FROM complaints c
       JOIN users u ON u.id = c.employee_id
       WHERE c.company_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Manager — respond to complaint + update status
const respondToComplaint = async (req, res) => {
  try {
    const { manager_response, status } = req.body
    const result = await pool.query(
      `UPDATE complaints SET manager_response=$1, status=$2, updated_at=NOW()
       WHERE id=$3 AND company_id=$4 RETURNING *`,
      [manager_response, status, req.params.id, req.user.company_id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Employee — raise a complaint
const raiseComplaint = async (req, res) => {
  try {
    const { title, description } = req.body
    const result = await pool.query(
      `INSERT INTO complaints (employee_id, company_id, title, description)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, req.user.company_id, title, description]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Employee — get own complaints
const getMyComplaints = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM complaints WHERE employee_id=$1 ORDER BY created_at DESC`,
      [req.user.id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  getOffboardingRequests, updateOffboardingStatus, deactivateEmployee,
  submitResignation, getMyOffboarding,
  getComplaints, respondToComplaint, raiseComplaint, getMyComplaints
}