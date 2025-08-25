import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './db.js';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import tz from 'dayjs/plugin/timezone.js';
dayjs.extend(utc); dayjs.extend(tz);

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const BRANCH_ID = process.env.BRANCH_ID || 'SUC-XX';
const BRANCH_NAME = process.env.BRANCH_NAME || 'Sucursal';
const TZ = 'America/Mexico_City';

// ===== Helpers
function todayRangeLocal() {
  const start = dayjs().tz(TZ).startOf('day');
  const end = dayjs().tz(TZ).endOf('day');
  const dateLike = start.format('YYYY-MM-DD');
  return { start, end, dateLike, todayLocal: start.format('YYYY-MM-DD') };
}

function getTotalsToday() {
  const { dateLike } = todayRangeLocal();
  const totals = db.prepare(`
    SELECT
      IFNULL(SUM(total),0) AS total,
      COUNT(*) AS tickets,
      IFNULL(AVG(total),0) AS avg_ticket
    FROM sales
    WHERE status='PAID' AND dt LIKE ? || '%'
  `).get(dateLike);

  const by_origin = db.prepare(`
    SELECT origin, IFNULL(SUM(total),0) AS total, COUNT(*) AS tickets
    FROM sales
    WHERE status='PAID' AND dt LIKE ? || '%'
    GROUP BY origin
    ORDER BY total DESC
  `).all(dateLike);

  return { totals, by_origin };
}

function getStockByProduct() {
  const rows = db.prepare(`
    SELECT p.id as product_id, p.name, p.sku, p.min_stock,
      IFNULL((SELECT IFNULL(SUM(qty),0) FROM inventory_moves m WHERE m.product_id = p.id AND m.type='IN'),0)
      - IFNULL((SELECT IFNULL(SUM(qty),0) FROM inventory_moves m WHERE m.product_id = p.id AND m.type='OUT'),0) AS stock
    FROM products p
    WHERE p.active=1
    ORDER BY p.name
  `).all();
  return rows;
}

function getLowStock() {
  const rows = getStockByProduct();
  return rows.filter(r => r.min_stock>0 && (r.stock||0) <= r.min_stock);
}

async function sendDailyEmail() {
  const { todayLocal } = todayRangeLocal();
  const { totals, by_origin } = getTotalsToday();
  const low = getLowStock();
  const recipients = (process.env.REPORT_EMAILS || '').split(',').map(s=>s.trim()).filter(Boolean);
  if (!recipients.length) {
    console.log('No REPORT_EMAILS configured - skipping email.');
    return { ok:false, reason:'REPORT_EMAILS vacío' };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  const currency = new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'});
  const rowsHtml = by_origin.map(o => `<tr><td>${o.origin}</td><td>${o.tickets}</td><td>${currency.format(o.total)}</td></tr>`).join('');
  const lowHtml = low.length
    ? low.map(i=>`<tr><td>${i.sku || i.product_id}</td><td>${i.name}</td><td>${i.stock}</td><td>${i.min_stock}</td></tr>`).join('')
    : `<tr><td colspan="4">Sin alertas</td></tr>`;

  const html = `
  <div style="font-family:system-ui,Segoe UI,Roboto,Arial">
    <h2>Reporte diario — ${BRANCH_NAME} (${BRANCH_ID})</h2>
    <p>Fecha: <b>${todayLocal}</b></p>
    <h3>Ventas de hoy</h3>
    <p><b>Total:</b> ${currency.format(totals.total)} — <b>Tickets:</b> ${totals.tickets} — <b>Ticket promedio:</b> ${currency.format(totals.avg_ticket)}</p>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead><tr><th>Origen</th><th>Tickets</th><th>Total</th></tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <h3 style="margin-top:16px">Stock crítico</h3>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead><tr><th>SKU</th><th>Producto</th><th>Stock</th><th>Mínimo</th></tr></thead>
      <tbody>${lowHtml}</tbody>
    </table>
  </div>
  `;

  const info = await transporter.sendMail({
    from: process.env.FROM_EMAIL || 'reportes@local',
    to: recipients,
    subject: `Reporte diario ${BRANCH_NAME} ${todayLocal}`,
    html
  });

  console.log('Email enviado:', info.messageId);
  return { ok:true };
}

// ---- middleware API key para acciones sensibles
function requireApiKey(req, res, next) {
  const key = req.header('x-api-key') || '';
  if (!process.env.API_KEY || key !== process.env.API_KEY) {
    return res.status(401).json({error:'API key inválida o ausente'});
  }
  next();
}

// ---- API principal
app.get('/api/health', (req,res)=>{
  res.json({ ok:true, branch: { id: BRANCH_ID, name: BRANCH_NAME } });
});

app.get('/api/stats/today', (req,res)=>{
  const { todayLocal } = todayRangeLocal();
  const data = getTotalsToday();
  res.json({ todayLocal, branch: { id: BRANCH_ID, name: BRANCH_NAME }, ...data });
});

app.get('/api/stock/low', (req,res)=>{
  const items = getLowStock();
  res.json({ items });
});

app.post('/api/email/daily', requireApiKey, async (req,res)=>{
  try{
    const r = await sendDailyEmail();
    if (!r.ok) return res.status(400).json(r);
    res.json({ ok:true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, error: e.message });
  }
});

// ====== CHAT (Socket.IO) ======
import http from 'http';
import { Server as IOServer } from 'socket.io';

const server = http.createServer(app);
const io = new IOServer(server);

function id(prefix='ID'){
  return prefix + '-' + Math.random().toString(36).slice(2,8).toUpperCase();
}

// API chat
app.get('/api/chat/threads', (req,res)=>{
  const rows = db.prepare('SELECT id,name,type FROM chat_threads WHERE branch_id=? ORDER BY name').all(BRANCH_ID);
  res.json({ items: rows });
});

app.get('/api/chat/history/:thread_id', (req,res)=>{
  const { thread_id } = req.params;
  const rows = db.prepare('SELECT id,thread_id,user_id,user_name,body,created_at FROM chat_messages WHERE thread_id=? ORDER BY created_at ASC LIMIT 200').all(thread_id);
  res.json({ items: rows });
});

io.on('connection', socket => {
  socket.on('join', ({ thread_id })=>{
    socket.join(thread_id);
  });

  socket.on('chat:send', payload => {
    try {
      const { thread_id, user_id, user_name, body } = payload || {};
      if (!thread_id || !body) return;
      // persist
      const msgId = id('MSG');
      const created = dayjs().tz(TZ).format('YYYY-MM-DD HH:mm:ss');
      db.prepare('INSERT INTO chat_messages (id,thread_id,user_id,user_name,body,attachments_json,created_at) VALUES (?,?,?,?,?,?,?)')
        .run(msgId, thread_id, user_id || 'U-ANON', user_name || 'Anónimo', body, null, created);
      const msg = { id: msgId, thread_id, user_id, user_name, body, created_at: created };
      // broadcast
      io.to(thread_id).emit('chat:new', msg);
    } catch (e) {
      console.error('chat:send error:', e.message);
    }
  });
});

// ---- Cron diario (por defecto 21:00 hora CDMX)
const cronHour = Number(process.env.REPORT_CRON_HOUR || 21);
const cronMinute = Number(process.env.REPORT_CRON_MINUTE || 0);
const cronExp = `${cronMinute} ${cronHour} * * *`;
cron.schedule(cronExp, async ()=>{
  try{
    console.log('CRON: enviando reporte diario...');
    await sendDailyEmail();
  } catch(e){
    console.error('CRON error:', e.message);
  }
}, { timezone: TZ });

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>{
  console.log(`Sucursal ${BRANCH_ID} — servidor en http://localhost:${PORT}`);
});
