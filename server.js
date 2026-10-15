require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '', database: process.env.DB_NAME || 'photography_studio',
  waitForConnections: true, connectionLimit: 10, dateStrings: true
});
// Static HTML pages are served from public; the backend exposes JSON APIs.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({ secret: process.env.SESSION_SECRET || 'change-this-development-secret', resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 4 } }));

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const requireAdmin = (req, res, next) => req.session.admin ? next() : res.status(401).json({ error: 'Please log in as an administrator.' });
const clean = value => String(value ?? '').trim();
const validEmail = value => !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/admin', (req, res) => req.session.admin ? res.sendFile(path.join(__dirname, 'public', 'admin.html')) : res.redirect('/login'));
app.get('/api/session', (req, res) => res.json({ authenticated: !!req.session.admin, admin: req.session.admin || null }));
app.get('/api/auth/setup-status', asyncRoute(async (req, res) => { const [[row]] = await pool.query('SELECT COUNT(*) total FROM admins'); res.json({ exists: row.total > 0 }); }));

app.post('/api/auth/register-first-admin', asyncRoute(async (req, res) => {
  const [rows] = await pool.query('SELECT COUNT(*) AS total FROM admins');
  if (rows[0].total > 0) return res.status(403).json({ error: 'An admin already exists. Please log in.' });
  const name = clean(req.body.name), email = clean(req.body.email).toLowerCase(), password = String(req.body.password || '');
  if (!name || !validEmail(email) || password.length < 8) return res.status(400).json({ error: 'Enter a name, valid email, and password of at least 8 characters.' });
  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute('INSERT INTO admins (name,email,password_hash) VALUES (?,?,?)', [name, email, hash]);
  req.session.admin = { id: result.insertId, name, email };
  res.json({ message: 'Administrator created. You are now logged in.' });
}));
app.post('/api/auth/login', asyncRoute(async (req, res) => {
  const email = clean(req.body.email).toLowerCase(), password = String(req.body.password || '');
  const [rows] = await pool.execute('SELECT id,name,email,password_hash FROM admins WHERE email=?', [email]);
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) return res.status(401).json({ error: 'Incorrect email or password.' });
  req.session.admin = { id: rows[0].id, name: rows[0].name, email: rows[0].email };
  res.json({ message: 'Login successful.' });
}));
app.post('/api/auth/logout', (req, res) => req.session.destroy(() => res.json({ message: 'Logged out.' })));

app.get('/api/public/services', asyncRoute(async (req, res) => {
  const [rows] = await pool.query("SELECT id,name,category,description,duration_hours,price FROM services WHERE status='Active' ORDER BY id DESC");
  res.json(rows);
}));
app.post('/api/public/bookings', asyncRoute(async (req, res) => {
  const name = clean(req.body.name), phone = clean(req.body.phone), email = clean(req.body.email).toLowerCase();
  const serviceId = Number(req.body.service_id), date = clean(req.body.booking_date), time = clean(req.body.booking_time || '09:00'), location = clean(req.body.location), notes = clean(req.body.notes);
  if (!name || !phone || !serviceId || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !validEmail(email)) return res.status(400).json({ error: 'Please complete the required fields using valid details.' });
  if (date < new Date().toISOString().slice(0, 10)) return res.status(400).json({ error: 'Please select today or a future date.' });
  const [services] = await pool.execute("SELECT id,price FROM services WHERE id=? AND status='Active'", [serviceId]);
  if (!services.length) return res.status(400).json({ error: 'Please select an available service.' });
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    let [customers] = await conn.execute('SELECT id FROM customers WHERE phone=? LIMIT 1', [phone]);
    let customerId;
    if (customers.length) {
      customerId = customers[0].id;
      await conn.execute('UPDATE customers SET name=?,email=? WHERE id=?', [name, email || null, customerId]);
    } else {
      const [customer] = await conn.execute('INSERT INTO customers (name,phone,email) VALUES (?,?,?)', [name, phone, email || null]);
      customerId = customer.insertId;
    }
    const [booking] = await conn.execute('INSERT INTO bookings (customer_id,service_id,booking_date,booking_time,location,notes,total_amount) VALUES (?,?,?,?,?,?,?)', [customerId, serviceId, date, time + (time.length === 5 ? ':00' : ''), location || null, notes || null, services[0].price]);
    await conn.commit(); res.status(201).json({ message: 'Booking request submitted! The studio will contact you to confirm.', booking_id: booking.insertId });
  } catch (e) { await conn.rollback(); throw e; } finally { conn.release(); }
}));

app.use('/api/admin', requireAdmin);
app.get('/api/admin/dashboard', asyncRoute(async (req, res) => {
  const [[customers]] = await pool.query('SELECT COUNT(*) total FROM customers');
  const [[bookings]] = await pool.query('SELECT COUNT(*) total FROM bookings');
  const [[photographers]] = await pool.query("SELECT COUNT(*) total FROM photographers WHERE status='Active'");
  const [[revenue]] = await pool.query("SELECT COALESCE(SUM(amount),0) total FROM payments WHERE status='Paid'");
  const [recent] = await pool.query(`SELECT b.id,b.booking_date,b.booking_time,b.status,b.total_amount,c.name customer,s.name service
    FROM bookings b JOIN customers c ON c.id=b.customer_id JOIN services s ON s.id=b.service_id ORDER BY b.created_at DESC LIMIT 6`);
  res.json({ customers: customers.total, bookings: bookings.total, photographers: photographers.total, revenue: Number(revenue.total), recent });
}));
const resources = {
  services: { table: 'services', fields: ['name', 'category', 'description', 'duration_hours', 'price', 'status'], required: ['name', 'category'], search: ['name', 'category'], order: 'id DESC' },
  customers: { table: 'customers', fields: ['name', 'phone', 'email', 'address'], required: ['name', 'phone'], search: ['name', 'phone', 'email'], order: 'id DESC' },
  photographers: { table: 'photographers', fields: ['name', 'phone', 'email', 'specialty', 'status'], required: ['name'], search: ['name', 'specialty', 'phone'], order: 'id DESC' }
};
function resourceRouter(resource) {
  const config = resources[resource], table = config.table;
  app.get(`/api/admin/${resource}`, asyncRoute(async (req, res) => {
    const search = clean(req.query.search);
    let sql = `SELECT * FROM ${table}`, params = [];
    if (search) { sql += ' WHERE ' + config.search.map(f => `${f} LIKE ?`).join(' OR '); params = config.search.map(() => `%${search}%`); }
    sql += ` ORDER BY ${config.order}`;
    const [rows] = await pool.execute(sql, params); res.json(rows);
  }));
  app.post(`/api/admin/${resource}`, asyncRoute(async (req, res) => {
    const values = config.fields.map(f => req.body[f] === '' ? null : req.body[f]);
    for (const field of config.required) if (!clean(req.body[field])) return res.status(400).json({ error: `${field} is required.` });
    if (req.body.email && !validEmail(req.body.email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    const [result] = await pool.execute(`INSERT INTO ${table} (${config.fields.join(',')}) VALUES (${config.fields.map(() => '?').join(',')})`, values);
    res.status(201).json({ message: 'Record created.', id: result.insertId });
  }));
  app.put(`/api/admin/${resource}/:id`, asyncRoute(async (req, res) => {
    const values = config.fields.map(f => req.body[f] === '' ? null : req.body[f]);
    for (const field of config.required) if (!clean(req.body[field])) return res.status(400).json({ error: `${field} is required.` });
    if (req.body.email && !validEmail(req.body.email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    const [result] = await pool.execute(`UPDATE ${table} SET ${config.fields.map(f => `${f}=?`).join(',')} WHERE id=?`, [...values, Number(req.params.id)]);
    if (!result.affectedRows) return res.status(404).json({ error: 'Record not found.' }); res.json({ message: 'Record updated.' });
  }));
  app.delete(`/api/admin/${resource}/:id`, asyncRoute(async (req, res) => {
    try { const [result] = await pool.execute(`DELETE FROM ${table} WHERE id=?`, [Number(req.params.id)]); if (!result.affectedRows) return res.status(404).json({ error: 'Record not found.' }); res.json({ message: 'Record deleted.' }); }
    catch (e) { if (e.code === 'ER_ROW_IS_REFERENCED_2') return res.status(409).json({ error: 'This record is used by a booking and cannot be deleted.' }); throw e; }
  }));
}
Object.keys(resources).forEach(resourceRouter);

app.get('/api/admin/bookings', asyncRoute(async (req, res) => {
  const search = clean(req.query.search), status = clean(req.query.status); let where = [], params = [];
  if (search) { where.push('(c.name LIKE ? OR s.name LIKE ? OR CAST(b.id AS CHAR) LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
  if (status) { where.push('b.status=?'); params.push(status); }
  const [rows] = await pool.execute(`SELECT b.*,c.name customer_name,c.phone customer_phone,c.email customer_email,s.name service_name,p.name photographer_name FROM bookings b JOIN customers c ON c.id=b.customer_id JOIN services s ON s.id=b.service_id LEFT JOIN photographers p ON p.id=b.photographer_id ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY b.booking_date DESC,b.booking_time DESC`, params); res.json(rows);
}));
app.put('/api/admin/bookings/:id', asyncRoute(async (req, res) => {
  const status = clean(req.body.status), photographerId = req.body.photographer_id ? Number(req.body.photographer_id) : null;
  if (!['Pending', 'Confirmed', 'Completed', 'Cancelled'].includes(status)) return res.status(400).json({ error: 'Invalid booking status.' });
  const [result] = await pool.execute('UPDATE bookings SET status=?,photographer_id=? WHERE id=?', [status, photographerId, Number(req.params.id)]);
  if (!result.affectedRows) return res.status(404).json({ error: 'Booking not found.' }); res.json({ message: 'Booking updated.' });
}));
app.post('/api/admin/bookings/:id/payment', asyncRoute(async (req, res) => {
  const bookingId = Number(req.params.id), method = clean(req.body.method || 'Cash');
  if (!['Cash', 'Card (Demo)', 'Bank Transfer (Demo)'].includes(method)) return res.status(400).json({ error: 'Invalid payment method.' });
  const [rows] = await pool.execute('SELECT id,total_amount FROM bookings WHERE id=?', [bookingId]); if (!rows.length) return res.status(404).json({ error: 'Booking not found.' });
  const [existing] = await pool.execute("SELECT id FROM payments WHERE booking_id=? AND status='Paid'", [bookingId]); if (existing.length) return res.status(409).json({ error: 'This booking is already marked as paid.' });
  const reference = 'DEMO-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  await pool.execute("INSERT INTO payments (booking_id,amount,method,status,reference_code,paid_at) VALUES (?,?,?,'Paid',?,NOW())", [bookingId, rows[0].total_amount, method, reference]);
  res.status(201).json({ message: 'Demo payment recorded. No real money was charged.', reference });
}));
app.get('/api/admin/reports', asyncRoute(async (req, res) => {
  const [monthly] = await pool.query(`SELECT DATE_FORMAT(paid_at,'%Y-%m') month, SUM(amount) revenue, COUNT(*) payments FROM payments WHERE status='Paid' AND paid_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(paid_at,'%Y-%m') ORDER BY month`);
  const [statuses] = await pool.query('SELECT status,COUNT(*) count FROM bookings GROUP BY status');
  const [popular] = await pool.query('SELECT s.name service,COUNT(b.id) bookings,COALESCE(SUM(CASE WHEN b.status<>\'Cancelled\' THEN b.total_amount ELSE 0 END),0) value FROM services s LEFT JOIN bookings b ON b.service_id=s.id GROUP BY s.id,s.name ORDER BY bookings DESC');
  const [payments] = await pool.query('SELECT p.id,p.booking_id,p.amount,p.method,p.status,p.reference_code,p.paid_at,c.name customer FROM payments p JOIN bookings b ON b.id=p.booking_id JOIN customers c ON c.id=b.customer_id ORDER BY p.created_at DESC LIMIT 100');
  res.json({ monthly, statuses, popular, payments });
}));

app.use((err, req, res, next) => { console.error(err); if (res.headersSent) return next(err); res.status(500).json({ error: 'Something went wrong. Check the server terminal and database settings.' }); });
(async () => { try { await pool.query('SELECT 1'); console.log('MySQL connected.'); } catch (e) { console.warn('MySQL is not connected yet:', e.message); } app.listen(PORT, () => console.log(`Photography Studio app: http://localhost:${PORT}`)); })();
