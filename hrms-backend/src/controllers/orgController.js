const pool = require('../config/db')

// Departments
exports.getDepartments = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM departments WHERE company_id = $1 ORDER BY created_at DESC',
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error fetching departments' })
  }
}

exports.createDepartment = async (req, res) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ success: false, message: 'Department name is required' })

    const result = await pool.query(
      'INSERT INTO departments (company_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.company_id, name]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error creating department' })
  }
}

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM departments WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
    res.json({ success: true, message: 'Department deleted successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error deleting department' })
  }
}

exports.toggleDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { is_active } = req.body
    const result = await pool.query(
      'UPDATE departments SET is_active = $1 WHERE id = $2 AND company_id = $3 RETURNING *',
      [is_active, id, req.user.company_id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error updating department status' })
  }
}

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body
    const result = await pool.query(
      'UPDATE departments SET name = $1 WHERE id = $2 AND company_id = $3 RETURNING *',
      [name, id, req.user.company_id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error updating department' })
  }
}

// Designations
exports.getDesignations = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM designations WHERE company_id = $1 ORDER BY created_at DESC',
      [req.user.company_id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error fetching designations' })
  }
}

exports.createDesignation = async (req, res) => {
  try {
    const { name, default_salary, expected_working_hours } = req.body
    if (!name) return res.status(400).json({ success: false, message: 'Designation name is required' })

    const result = await pool.query(
      'INSERT INTO designations (company_id, name, default_salary, expected_working_hours) VALUES ($1, $2, $3, $4) RETURNING *',
      [req.user.company_id, name, default_salary || 0, expected_working_hours || 8]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error creating designation' })
  }
}

exports.deleteDesignation = async (req, res) => {
  try {
    const { id } = req.params
    await pool.query('DELETE FROM designations WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
    res.json({ success: true, message: 'Designation deleted successfully' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error deleting designation' })
  }
}

exports.toggleDesignationStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { is_active } = req.body
    const result = await pool.query(
      'UPDATE designations SET is_active = $1 WHERE id = $2 AND company_id = $3 RETURNING *',
      [is_active, id, req.user.company_id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error updating designation status' })
  }
}

exports.updateDesignation = async (req, res) => {
  try {
    const { id } = req.params
    const { name, default_salary, expected_working_hours } = req.body
    const result = await pool.query(
      'UPDATE designations SET name = $1, default_salary = $2, expected_working_hours = $3 WHERE id = $4 AND company_id = $5 RETURNING *',
      [name, default_salary || 0, expected_working_hours || 8, id, req.user.company_id]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false, message: 'Server error updating designation' })
  }
}
