const pool = require('../config/db')
const { checkFeatureAccess } = require('../utils/planGating')

// HOLIDAYS 

const getHolidays = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM holidays WHERE company_id=$1 ORDER BY date',
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const createHoliday = async (req, res) => {
  try {
    const gate = await checkFeatureAccess(req.user.company_id, 'holidays')
    if (!gate.allowed) return res.status(403).json({ success: false, code: 'FEATURE_GATED', feature: 'holidays' })
    const { name, date } = req.body
    const result = await pool.query(
      'INSERT INTO holidays (company_id, name, date) VALUES ($1,$2,$3) RETURNING *',
      [req.user.company_id, name, date]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const deleteHoliday = async (req, res) => {
  try {
    await pool.query('DELETE FROM holidays WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id])
    res.json({ success: true, message: 'Holiday deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// COMPANY POLICIES 

const getPolicies = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM company_policies WHERE company_id=$1 ORDER BY created_at DESC',
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const createPolicy = async (req, res) => {
  try {
    const gate = await checkFeatureAccess(req.user.company_id, 'policies')
    if (!gate.allowed) return res.status(403).json({ success: false, code: 'FEATURE_GATED', feature: 'policies' })
    const { title, content } = req.body
    const result = await pool.query(
      'INSERT INTO company_policies (company_id, title, content) VALUES ($1,$2,$3) RETURNING *',
      [req.user.company_id, title, content]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const deletePolicy = async (req, res) => {
  try {
    await pool.query('DELETE FROM company_policies WHERE id=$1 AND company_id=$2', [req.params.id, req.user.company_id])
    res.json({ success: true, message: 'Policy deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

//  MANAGER PROFILE and SETTINGS

const getProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, email, phone, address, department, designation, role, profile_photo
       FROM users WHERE id=$1`,
      [req.user.id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const updateProfile = async (req, res) => {
  try {
    const { first_name, last_name, phone, address, designation, department, profile_photo } = req.body
    const result = await pool.query(
      `UPDATE users SET first_name=$1, last_name=$2, phone=$3, address=$4, 
       designation=$5, department=$6, profile_photo=$7
       WHERE id=$8 RETURNING id, first_name, last_name, email, phone, address, designation, department, profile_photo`,
      [first_name, last_name, phone, address, designation || null, department || null, profile_photo || null, req.user.id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}
// DASHBOARD STATS 

const getDashboardStats = async (req, res) => {
  try {
    const company_id = req.user.company_id
    const total = await pool.query(`SELECT COUNT(*) FROM users WHERE company_id=$1 AND role='employee'`, [company_id])
    const active = await pool.query(`SELECT COUNT(*) FROM users WHERE company_id=$1 AND role='employee' AND is_active=true`, [company_id])
    const pendingLeaves = await pool.query(`SELECT COUNT(*) FROM leaves WHERE company_id=$1 AND status='Pending'`, [company_id])
    const pendingExpenses = await pool.query(`SELECT COUNT(*) FROM expenses WHERE company_id=$1 AND status='Pending'`, [company_id])
    res.json({
      success: true,
      data: {
        total_employees: total.rows[0].count,
        active_employees: active.rows[0].count,
        pending_leaves: pendingLeaves.rows[0].count,
        pending_expenses: pendingExpenses.rows[0].count,
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Get all managers in this company — for the Employees page Managers section
const getManagers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.department,
              u.designation, u.joining_date, u.is_active, u.profile_photo,
              sh.name as shift_name, sh.shift_code, sh.id as shift_id
       FROM users u
       LEFT JOIN shift_assignments sa ON sa.user_id = u.id AND sa.effective_to IS NULL
       LEFT JOIN shifts sh ON sh.id = sa.shift_id
       WHERE u.company_id = $1 AND u.role = 'manager'
       ORDER BY u.created_at DESC`,
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getManagers error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Get all staff (employees + managers) — used by shift management modals
const getAllStaff = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.phone, u.department,
              u.designation, u.role, u.is_active, u.profile_photo,
              sh.name as shift_name, sh.shift_code, sh.id as shift_id
       FROM users u
       LEFT JOIN shift_assignments sa ON sa.user_id = u.id AND sa.effective_to IS NULL
       LEFT JOIN shifts sh ON sh.id = sa.shift_id
       WHERE u.company_id = $1 AND u.role IN ('employee','manager') AND u.is_active = true
       ORDER BY u.role ASC, u.first_name ASC`,
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getAllStaff error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Update a manager's profile details — mirrors updateEmployee
const updateManager = async (req, res) => {
  try {
    const { first_name, last_name, phone, department, designation, joining_date, is_active } = req.body
    const result = await pool.query(
      `UPDATE users SET first_name=$1, last_name=$2, phone=$3, department=$4,
              designation=$5, joining_date=$6, is_active=$7
       WHERE id=$8 AND company_id=$9 AND role='manager'
       RETURNING id, first_name, last_name, email`,
      [first_name, last_name, phone, department, designation, joining_date, is_active,
       req.params.id, req.user.company_id]
    )
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Manager not found' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('updateManager error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// SHIFTS

// Get all shifts for the company
const getShifts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*,
              COUNT(sa.id) FILTER (WHERE sa.effective_to IS NULL) as employee_count
       FROM shifts s
       LEFT JOIN shift_assignments sa ON sa.shift_id = s.id
       WHERE s.company_id = $1
       GROUP BY s.id
       ORDER BY s.is_default DESC, s.created_at ASC`,
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getShifts error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Create a new shift — enforces the plan limit on number of shifts
const createShift = async (req, res) => {
  try {
    const gate = await checkFeatureAccess(req.user.company_id, 'shifts')
    if (gate.limit !== null && gate.currentUsage >= gate.limit) {
      return res.status(403).json({
        success: false,
        code: 'SHIFT_LIMIT_REACHED',
        message: `Your plan allows up to ${gate.limit} shift${gate.limit === 1 ? '' : 's'}. Upgrade to create more.`
      })
    }

    const { name, start_time, end_time, is_overnight, late_threshold_mins, half_day_threshold_mins, break_allowed, work_days } = req.body
    if (!name || !start_time || !end_time) {
      return res.status(400).json({ success: false, message: 'name, start_time, and end_time are required.' })
    }

    // Auto-generate shift code: SHF-00N based on existing count
    const countResult = await pool.query('SELECT COUNT(*) FROM shifts WHERE company_id = $1', [req.user.company_id])
    const shiftCode = `SHF-${String(parseInt(countResult.rows[0].count) + 1).padStart(3, '0')}`

    const result = await pool.query(
      `INSERT INTO shifts
         (company_id, name, shift_code, start_time, end_time, is_overnight,
          late_threshold_mins, half_day_threshold_mins, break_allowed, work_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        req.user.company_id, name, shiftCode, start_time, end_time,
        is_overnight || false,
        late_threshold_mins ?? 15,
        half_day_threshold_mins ?? 240,
        break_allowed !== false,
        work_days || ['Mon','Tue','Wed','Thu','Fri']
      ]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('createShift error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Update shift details
const updateShift = async (req, res) => {
  try {
    const { name, start_time, end_time, is_overnight, late_threshold_mins, half_day_threshold_mins, break_allowed, work_days } = req.body
    const result = await pool.query(
      `UPDATE shifts SET
         name = $1, start_time = $2, end_time = $3, is_overnight = $4,
         late_threshold_mins = $5, half_day_threshold_mins = $6,
         break_allowed = $7, work_days = $8
       WHERE id = $9 AND company_id = $10
       RETURNING *`,
      [name, start_time, end_time, is_overnight || false,
       late_threshold_mins ?? 15, half_day_threshold_mins ?? 240,
       break_allowed !== false, work_days || ['Mon','Tue','Wed','Thu','Fri'],
       req.params.id, req.user.company_id]
    )
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Shift not found' })
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('updateShift error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Delete a shift — blocks if it's the default or has active employees
const deleteShift = async (req, res) => {
  try {
    const shift = await pool.query(
      'SELECT * FROM shifts WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    )
    if (!shift.rows.length) return res.status(404).json({ success: false, message: 'Shift not found' })
    if (shift.rows[0].is_default) {
      return res.status(400).json({ success: false, message: 'Cannot delete the default shift.' })
    }

    const activeCount = await pool.query(
      'SELECT COUNT(*) FROM shift_assignments WHERE shift_id = $1 AND effective_to IS NULL',
      [req.params.id]
    )
    if (parseInt(activeCount.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Reassign all employees from this shift before deleting it.'
      })
    }

    await pool.query('DELETE FROM shifts WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id])
    res.json({ success: true, message: 'Shift deleted' })
  } catch (err) {
    console.error('deleteShift error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Get all employees assigned to a specific shift
const getShiftEmployees = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.department,
              u.designation, u.profile_photo, sa.effective_from
       FROM shift_assignments sa
       JOIN users u ON u.id = sa.user_id
       WHERE sa.shift_id = $1 AND sa.effective_to IS NULL
         AND u.company_id = $2
       ORDER BY u.first_name ASC`,
      [req.params.id, req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getShiftEmployees error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Reassign an employee to a different shift — closes the old assignment and opens a new one
const assignEmployeeToShift = async (req, res) => {
  try {
    const { user_id, shift_id, effective_from } = req.body
    if (!user_id || !shift_id) {
      return res.status(400).json({ success: false, message: 'user_id and shift_id are required.' })
    }

    const effectiveDate = effective_from || new Date().toISOString().substring(0, 10)

    // Close the current active assignment for this user
    await pool.query(
      `UPDATE shift_assignments SET effective_to = $1
       WHERE user_id = $2 AND effective_to IS NULL`,
      [effectiveDate, user_id]
    )

    // Open the new assignment
    await pool.query(
      `INSERT INTO shift_assignments (user_id, shift_id, company_id, effective_from, assigned_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [user_id, shift_id, req.user.company_id, effectiveDate, req.user.id]
    )

    res.json({ success: true, message: 'Employee reassigned to shift.' })
  } catch (err) {
    console.error('assignEmployeeToShift error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Get all employees not assigned to any shift (for bulk assign UI)
const getUnassignedEmployees = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, u.role, u.department
       FROM users u
       WHERE u.company_id = $1
         AND u.role IN ('employee','manager')
         AND u.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM shift_assignments sa
           WHERE sa.user_id = u.id AND sa.effective_to IS NULL
         )
       ORDER BY u.first_name ASC`,
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getUnassignedEmployees error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

module.exports = {
  getHolidays, createHoliday, deleteHoliday,
  getPolicies, createPolicy, deletePolicy,
  getProfile, updateProfile,
  getDashboardStats,
  getManagers, getAllStaff, updateManager,
  getShifts, createShift, updateShift, deleteShift,
  getShiftEmployees, assignEmployeeToShift, getUnassignedEmployees
}