const express = require('express');
const { AccessToken } = require('livekit-server-sdk');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const LK_API_KEY    = process.env.LK_API_KEY    || 'APIdN3BFb5uq8vR';
const LK_API_SECRET = process.env.LK_API_SECRET || 'NvTIlRgHftjjYKef53beJX4tZcfCXAj93hKHyOLZVLfC';
const LK_WS_URL     = process.env.LK_WS_URL     || 'wss://hamseda-rutlgpu6.livekit.cloud';
const ADMIN_CODE    = process.env.ADMIN_CODE     || '1234';
const ROOM_NAME     = 'be-yad-dargozashtegan';
const APP_URL       = process.env.APP_URL        || 'https://hamseda.onrender.com';

// حافظه موقت
let deceasedList = ['روحش شاد — حاج علی محمدی (۱۳۱۰-۱۳۹۵)', 'یادش گرامی — مرحومه فاطمه احمدی (۱۳۲۵-۱۴۰۰)'];
let gallery = [];
let memories = [];
let candles = [];
let prayerText = 'اللهم اغفر لهم وارحمهم\nخداوندا آنها را بیامرز و رحمت فرما\n\nروح‌شان شاد و یادشان گرامی باد 🕯️';
let handsUp = new Set();
let allowedSpeakers = new Set();

// Ping
app.get('/ping', (req, res) => res.json({ ok: true }));

// Token
app.post('/api/token', async (req, res) => {
  try {
    const { userName, adminCode } = req.body;
    if (!userName) return res.status(400).json({ error: 'اسم وارد نشده' });
    const isAdmin = adminCode === ADMIN_CODE;
    const at = new AccessToken(LK_API_KEY, LK_API_SECRET, {
      identity: userName + '_' + Date.now(),
      name: userName,
      ttl: '8h',
    });
    at.addGrant({
      roomJoin: true,
      room: ROOM_NAME,
      canPublish: true,      // همه میتونن publish کنن — کنترل با میوت
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();
    res.json({ token, wsUrl: LK_WS_URL, isAdmin });
  } catch (e) {
    console.error('token error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Room state
app.get('/api/room-state', (req, res) => {
  res.json({ handsUp: [...handsUp], allowedSpeakers: [...allowedSpeakers] });
});

app.post('/api/hand', (req, res) => {
  const { identity, raised } = req.body;
  if (!identity) return res.status(400).json({ error: 'identity نیست' });
  raised ? handsUp.add(identity) : handsUp.delete(identity);
  res.json({ ok: true });
});

app.post('/api/allow-speak', (req, res) => {
  const { adminCode, identity, allow } = req.body;
  if (adminCode !== ADMIN_CODE) return res.status(403).json({ error: 'کد اشتباه' });
  if (allow) { allowedSpeakers.add(identity); handsUp.delete(identity); }
  else allowedSpeakers.delete(identity);
  res.json({ ok: true });
});

// Deceased
app.get('/api/deceased', (req, res) => res.json({ list: deceasedList }));
app.post('/api/deceased', (req, res) => {
  if (req.body.adminCode !== ADMIN_CODE) return res.status(403).json({ error: 'کد اشتباه' });
  deceasedList = req.body.list || [];
  res.json({ ok: true });
});

// Prayer
app.get('/api/prayer', (req, res) => res.json({ text: prayerText }));
app.post('/api/prayer', (req, res) => {
  if (req.body.adminCode !== ADMIN_CODE) return res.status(403).json({ error: 'کد اشتباه' });
  prayerText = req.body.text || '';
  res.json({ ok: true });
});

// Gallery
app.get('/api/gallery', (req, res) => res.json({ gallery }));
app.post('/api/gallery', (req, res) => {
  if (req.body.adminCode !== ADMIN_CODE) return res.status(403).json({ error: 'کد اشتباه' });
  gallery.push({ id: Date.now(), name: req.body.name, photo: req.body.photo, year: req.body.year });
  res.json({ ok: true });
});
app.delete('/api/gallery/:id', (req, res) => {
  if (req.body.adminCode !== ADMIN_CODE) return res.status(403).json({ error: 'کد اشتباه' });
  gallery = gallery.filter(g => g.id != req.params.id);
  res.json({ ok: true });
});

// Memories
app.get('/api/memories', (req, res) => res.json({ memories }));
app.post('/api/memories', (req, res) => {
  const { author, text } = req.body;
  if (!text || !author) return res.status(400).json({ error: 'ناقص' });
  memories.unshift({ id: Date.now(), author, text, date: new Date().toLocaleDateString('fa-IR') });
  res.json({ ok: true });
});

// Candles
app.get('/api/candles', (req, res) => res.json({ candles, count: candles.length }));
app.post('/api/candles', (req, res) => {
  candles.unshift({ name: req.body.name || 'ناشناس', time: new Date().toLocaleTimeString('fa-IR') });
  if (candles.length > 100) candles = candles.slice(0, 100);
  res.json({ ok: true, count: candles.length });
});

// Keepalive
setInterval(() => {
  require('https').get(APP_URL + '/ping', () => {}).on('error', () => {});
}, 10 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ سرور روی پورت ${PORT}`));
