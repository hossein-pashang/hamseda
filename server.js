const express = require('express');
const { AccessToken } = require('livekit-server-sdk');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const LK_API_KEY    = process.env.LK_API_KEY    || 'APIdN3BFb5uq8vR';
const LK_API_SECRET = process.env.LK_API_SECRET || 'NvTIlRgHftjjYKef53beJX4tZcfCXAj93hKHyOLZVLfC';
const LK_WS_URL     = process.env.LK_WS_URL     || 'wss://hamseda-rutlgpu6.livekit.cloud';
const ROOM_NAME     = 'be-yad-dargozashtegan';
const ADMIN_CODE    = process.env.ADMIN_CODE || '1234';

// ── حافظه موقت ──
let deceasedList = [
  'روحش شاد — حاج علی محمدی (۱۳۱۰-۱۳۹۵)',
  'یادش گرامی — مرحومه فاطمه احمدی (۱۳۲۵-۱۴۰۰)',
];
let gallery = []; // [{name, photo(base64), year}]
let memories = []; // [{author, text, date}]
let candles = []; // [{name, time}]
let prayerText = 'اللهم اغفر لهم وارحمهم\nخداوندا آنها را بیامرز و رحمت فرما\n\nروح‌شان شاد و یادشان گرامی باد 🕯️';
const roomState = { speakers: new Set(), handsUp: new Set() };

// ── PING ──
app.get('/ping', (req, res) => res.json({ status: 'ok' }));

// ── TOKEN ──
app.post('/api/token', async (req, res) => {
  const { userName, adminCode } = req.body;
  if (!userName) return res.status(400).json({ error: 'اسم وارد نشده' });
  const isAdmin = adminCode === ADMIN_CODE;
  try {
    const at = new AccessToken(LK_API_KEY, LK_API_SECRET, { identity: userName+'_'+Date.now(), name: userName, ttl:'6h' });
    at.addGrant({ roomJoin:true, room:ROOM_NAME, canPublish:isAdmin, canSubscribe:true, canPublishData:true, roomAdmin:isAdmin });
    const token = await at.toJwt();
    res.json({ token, wsUrl:LK_WS_URL, roomName:ROOM_NAME, isAdmin });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── ROOM STATE ──
app.post('/api/allow-speak', (req,res) => {
  const {adminCode,targetIdentity,allow} = req.body;
  if(adminCode!==ADMIN_CODE) return res.status(403).json({error:'کد اشتباه'});
  allow ? roomState.speakers.add(targetIdentity) : roomState.speakers.delete(targetIdentity);
  res.json({success:true});
});
app.post('/api/hand', (req,res) => {
  const {identity,raised} = req.body;
  raised ? roomState.handsUp.add(identity) : roomState.handsUp.delete(identity);
  res.json({success:true, handsUp:[...roomState.handsUp]});
});
app.get('/api/room-state', (req,res) => res.json({
  speakers:[...roomState.speakers], handsUp:[...roomState.handsUp]
}));

// ── DECEASED / TICKER ──
app.get('/api/deceased', (req,res) => res.json({list:deceasedList}));
app.post('/api/deceased', (req,res) => {
  const {adminCode,list} = req.body;
  if(adminCode!==ADMIN_CODE) return res.status(403).json({error:'کد اشتباه'});
  deceasedList = list;
  res.json({success:true});
});

// ── GALLERY ──
app.get('/api/gallery', (req,res) => res.json({gallery}));
app.post('/api/gallery', (req,res) => {
  const {adminCode,name,photo,year} = req.body;
  if(adminCode!==ADMIN_CODE) return res.status(403).json({error:'کد اشتباه'});
  gallery.push({id:Date.now(), name, photo, year});
  res.json({success:true});
});
app.delete('/api/gallery/:id', (req,res) => {
  const {adminCode} = req.body;
  if(adminCode!==ADMIN_CODE) return res.status(403).json({error:'کد اشتباه'});
  gallery = gallery.filter(g=>g.id!=req.params.id);
  res.json({success:true});
});

// ── MEMORIES ──
app.get('/api/memories', (req,res) => res.json({memories}));
app.post('/api/memories', (req,res) => {
  const {author,text} = req.body;
  if(!text||!author) return res.status(400).json({error:'ناقص'});
  memories.unshift({id:Date.now(), author, text, date: new Date().toLocaleDateString('fa-IR')});
  res.json({success:true});
});
app.delete('/api/memories/:id', (req,res) => {
  const {adminCode} = req.body;
  if(adminCode!==ADMIN_CODE) return res.status(403).json({error:'کد اشتباه'});
  memories = memories.filter(m=>m.id!=req.params.id);
  res.json({success:true});
});

// ── CANDLES ──
app.get('/api/candles', (req,res) => res.json({candles, count:candles.length}));
app.post('/api/candles', (req,res) => {
  const {name} = req.body;
  candles.unshift({name:name||'ناشناس', time: new Date().toLocaleTimeString('fa-IR')});
  if(candles.length>50) candles = candles.slice(0,50);
  res.json({success:true, count:candles.length});
});

// ── PRAYER ──
app.get('/api/prayer', (req,res) => res.json({text:prayerText}));
app.post('/api/prayer', (req,res) => {
  const {adminCode,text} = req.body;
  if(adminCode!==ADMIN_CODE) return res.status(403).json({error:'کد اشتباه'});
  prayerText = text;
  res.json({success:true});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ سرور روی پورت ${PORT}`));
