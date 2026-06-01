const pool = require('../config/db')

//  Date/Time Helpers 
// Converts current time to IST by adding 5h30m offset to UTC, then slices the ISO string
// Avoids toLocaleString which behaves inconsistently across Node versions
const getISTDate = () => {
  const utcMs = Date.now()
  const istMs = utcMs + (5.5 * 60 * 60 * 1000)
  return new Date(istMs).toISOString().substring(0, 10)
}

const getISTTime = () => {
  const utcMs = Date.now()
  const istMs = utcMs + (5.5 * 60 * 60 * 1000)
  return new Date(istMs).toISOString().substring(11, 19)
}

// Convert "HH:MM" or "HH:MM:SS" to total minutes from midnight
const timeToMinutes = (t) => {
  if (!t) return null
  const parts = t.split(':')
  return parseInt(parts[0]) * 60 + parseInt(parts[1])
}

// Format minutes as "Xh Ym"
const formatMinutes = (mins) => {
  if (mins === null || mins === undefined) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

// Compute working minutes = (clockOut - clockIn) - lunchDuration, floor at 0
const computeWorkingMinutes = (clockIn, clockOut, lunchStart, lunchEnd) => {
  const inMins  = timeToMinutes(clockIn)
  const outMins = timeToMinutes(clockOut)
  if (inMins === null || outMins === null) return null

  let totalMins = outMins - inMins
  if (totalMins < 0) totalMins += 24 * 60 // handle midnight crossover edge case

  let lunchMins = 0
  const lsMins = timeToMinutes(lunchStart)
  const leMins = timeToMinutes(lunchEnd)
  if (lsMins !== null && leMins !== null && leMins > lsMins) {
    lunchMins = leMins - lsMins
  }

  return Math.max(0, totalMins - lunchMins)
}

// Company Settings Helper 

// Fetch company settings with safe defaults if no row exists yet
const getCompanySettings = async (companyId) => {
  const result = await pool.query(
    'SELECT * FROM company_settings WHERE company_id = $1',
    [companyId]
  )
  if (result.rows.length > 0) return result.rows[0]
  // Return defaults if company hasn't configured settings yet
  return {
    work_start_time: '09:00',
    work_end_time: '18:00',
    late_threshold_mins: 15,
    half_day_threshold_mins: 240,
    work_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  }
}

// Determine status based on clock-in time vs company settings
const determineStatus = (clockInTime, settings) => {
  const clockInMins  = timeToMinutes(clockInTime)
  const workStartMins = timeToMinutes(settings.work_start_time)
  if (clockInMins === null || workStartMins === null) return 'Present'
  const threshold = workStartMins + (settings.late_threshold_mins || 15)
  return clockInMins > threshold ? 'Late' : 'Present'
}

//  Clock In 

const clockIn = async (req, res) => {
  try {
    const today = getISTDate()
    
    const existing = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2',
      [req.user.id, today]
    )

    if (existing.rows.length > 0) {
      const record = existing.rows[0]
      if (record.clock_out) {
        return res.status(400).json({
          success: false,
          message: 'You have already completed your attendance for today.'
        })
      }
      return res.status(400).json({
        success: false,
        message: 'Already clocked in today. Please clock out first.'
      })
    }

    const now = getISTTime()
    const settings = await getCompanySettings(req.user.company_id)
    const status = determineStatus(now, settings)

    const result = await pool.query(
      `INSERT INTO attendance (user_id, company_id, date, clock_in, status)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, req.user.company_id, today, now, status]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('clockIn error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Clock Out 

const clockOut = async (req, res) => {
  try {
    const today = getISTDate()

    const existing = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2',
      [req.user.id, today]
    )

    if (existing.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'You have not clocked in today.' })
    }

    const record = existing.rows[0]

    if (record.clock_out) {
      return res.status(400).json({ success: false, message: 'You have already clocked out today.' })
    }

    if (record.lunch_start && !record.lunch_end) {
      return res.status(400).json({
        success: false,
        message: 'You are currently on a lunch break. Please end your lunch break before clocking out.'
      })
    }

    const now = getISTTime()
    const workingMinutes = computeWorkingMinutes(
      record.clock_in, now, record.lunch_start, record.lunch_end
    )

    const result = await pool.query(
      `UPDATE attendance
       SET clock_out = $1, working_minutes = $2
       WHERE user_id = $3 AND date = $4
       RETURNING *`,
      [now, workingMinutes, req.user.id, today]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('clockOut error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Lunch Start 

const lunchStart = async (req, res) => {
  try {
    const today = getISTDate()

    const existing = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2',
      [req.user.id, today]
    )

    if (existing.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'You have not clocked in today.' })
    }

    const record = existing.rows[0]

    if (record.clock_out) {
      return res.status(400).json({ success: false, message: 'You have already clocked out today.' })
    }

    if (record.lunch_start) {
      return res.status(400).json({ success: false, message: 'Lunch break already started.' })
    }

    const now = getISTTime()
    const result = await pool.query(
      `UPDATE attendance SET lunch_start = $1 WHERE user_id = $2 AND date = $3 RETURNING *`,
      [now, req.user.id, today]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('lunchStart error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Lunch End 

const lunchEnd = async (req, res) => {
  try {
    const today = getISTDate()

    const existing = await pool.query(
      'SELECT * FROM attendance WHERE user_id = $1 AND date = $2',
      [req.user.id, today]
    )

    if (existing.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'You have not clocked in today.' })
    }

    const record = existing.rows[0]

    if (!record.lunch_start) {
      return res.status(400).json({ success: false, message: 'Lunch break has not been started.' })
    }

    if (record.lunch_end) {
      return res.status(400).json({ success: false, message: 'Lunch break already ended.' })
    }

    const now = getISTTime()
    const result = await pool.query(
      `UPDATE attendance SET lunch_end = $1 WHERE user_id = $2 AND date = $3 RETURNING *`,
      [now, req.user.id, today]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('lunchEnd error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Get Attendance (Manager — all company records) 

const getAttendance = async (req, res) => {
  try {
    const { date } = req.query
    let query = `
      SELECT a.*, u.first_name, u.last_name, u.department, u.designation, u.role
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.company_id = $1`
    const params = [req.user.company_id]
    if (date) { query += ` AND a.date = $2`; params.push(date) }
    query += ' ORDER BY a.date DESC, u.first_name ASC'
    const result = await pool.query(query, params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getAttendance error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Get Attendance Summary by Month (Manager)
// Returns a date-wise breakdown for the given month 
const getAttendanceSummaryByMonth = async (req, res) => {
  try {
    const { month } = req.query // format: "2026-06"
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'month query param required in YYYY-MM format' })
    }

    const companyId = req.user.company_id
    const [year, mon] = month.split('-').map(Number)

    // Get all attendance records for this month
    const attResult = await pool.query(
      `SELECT a.*, u.first_name, u.last_name, u.department, u.designation, u.role
       FROM attendance a
       JOIN users u ON a.user_id = u.id
       WHERE a.company_id = $1
         AND EXTRACT(YEAR FROM a.date) = $2
         AND EXTRACT(MONTH FROM a.date) = $3
       ORDER BY a.date ASC, u.first_name ASC`,
      [companyId, year, mon]
    )

    // Get all active employees and managers for this company
    const empResult = await pool.query(
      `SELECT id, first_name, last_name, department, designation, role
       FROM users
       WHERE company_id = $1 AND role IN ('employee', 'manager') AND is_active = true
       ORDER BY first_name ASC`,
      [companyId]
    )

    // Get holidays for this month
    const holResult = await pool.query(
      `SELECT date, name FROM holidays
       WHERE company_id = $1
         AND EXTRACT(YEAR FROM date) = $2
         AND EXTRACT(MONTH FROM date) = $3`,
      [companyId, year, mon]
    )

    // Get company settings for work_days
    const settings = await getCompanySettings(companyId)
    const workDays = settings.work_days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    // Build holiday lookup map: "YYYY-MM-DD" → name
    const holidayMap = {}
    holResult.rows.forEach(h => {
      const ds = typeof h.date === 'string' ? h.date.substring(0, 10) : h.date.toISOString().substring(0, 10)
      holidayMap[ds] = h.name
    })

    // Build attendance lookup: "YYYY-MM-DD" → [records]
    const attMap = {}
    attResult.rows.forEach(r => {
      const ds = typeof r.date === 'string' ? r.date.substring(0, 10) : r.date.toISOString().substring(0, 10)
      if (!attMap[ds]) attMap[ds] = []
      attMap[ds].push(r)
    })

    const employees = empResult.rows
    const totalEmployees = employees.length

    // Build per-date summary for all days in the month
    const daysInMonth = new Date(year, mon, 0).getDate()
    const summary = []

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(mon).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const jsDate = new Date(`${dateStr}T00:00:00`) // local midnight — safe since we built the string
      const dayName = DAY_NAMES[jsDate.getDay()]

      const isWeekend = !workDays.includes(dayName)
      const holidayName = holidayMap[dateStr] || null
      const dayRecords = attMap[dateStr] || []

      // Count statuses from records
      const presentCount  = dayRecords.filter(r => r.status === 'Present').length
      const lateCount     = dayRecords.filter(r => r.status === 'Late').length
      const onLeaveCount  = dayRecords.filter(r => r.status === 'On Leave').length
      const recordedCount = dayRecords.length

      // Absent only applies to past dates and today — future dates have no absences yet
      const todayIST = getISTDate()
      const isFuture = dateStr > todayIST
      const recordedIds = new Set(dayRecords.map(r => r.user_id))
      const absentEmployees = isWeekend || holidayName || isFuture
        ? []
        : employees.filter(e => !recordedIds.has(e.id))
      const absentCount = absentEmployees.length

      summary.push({
        date: dateStr,
        day_name: dayName,
        is_weekend: isWeekend,
        holiday_name: holidayName,
        total_employees: totalEmployees,
        present: presentCount,
        late: lateCount,
        on_leave: onLeaveCount,
        absent: absentCount,
        records: dayRecords,
        absent_employees: absentEmployees
      })
    }

    res.json({ success: true, data: summary })
  } catch (err) {
    console.error('getAttendanceSummaryByMonth error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Get My Attendance (Employee / Manager Self)

const getMyAttendance = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM attendance WHERE user_id = $1 ORDER BY date DESC`,
      [req.user.id]
    )
    res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('getMyAttendance error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Get / Save Company Settings 

const getCompanySettingsHandler = async (req, res) => {
  try {
    const settings = await getCompanySettings(req.user.company_id)
    res.json({ success: true, data: settings })
  } catch (err) {
    console.error('getCompanySettings error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

const saveCompanySettings = async (req, res) => {
  try {
    const { work_start_time, work_end_time, late_threshold_mins, half_day_threshold_mins, work_days } = req.body
    const result = await pool.query(
      `INSERT INTO company_settings
         (company_id, work_start_time, work_end_time, late_threshold_mins, half_day_threshold_mins, work_days, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (company_id)
       DO UPDATE SET
         work_start_time        = EXCLUDED.work_start_time,
         work_end_time          = EXCLUDED.work_end_time,
         late_threshold_mins    = EXCLUDED.late_threshold_mins,
         half_day_threshold_mins = EXCLUDED.half_day_threshold_mins,
         work_days              = EXCLUDED.work_days,
         updated_at             = NOW()
       RETURNING *`,
      [req.user.company_id, work_start_time, work_end_time, late_threshold_mins, half_day_threshold_mins, JSON.stringify(work_days)]
    )
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('saveCompanySettings error:', err)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// Exports 
module.exports = {
  getAttendance,
  getAttendanceSummaryByMonth,
  clockIn,
  clockOut,
  lunchStart,
  lunchEnd,
  getMyAttendance,
  getCompanySettingsHandler,
  saveCompanySettings,
  computeWorkingMinutes,
  formatMinutes
}