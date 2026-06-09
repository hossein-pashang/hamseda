const express = require('express');
const { AccessToken } = require('livekit-server-sdk');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const LK_API_KEY    = process.env.LK_API_KEY    || 'APIdN3BFb5uq8vR';
const LK_API_SECRET = process.env.LK_API_SECRET || 'NvTIlRgHftjjYKef53beJX4tZcfCXAj93hKHyOLZVLfC';
const LK_WS_URL     = process.env.LK_WS_URL     || 'wss://hamseda-rutlgpu6.livekit.cloud';
const ROOM_NAME     = 'be-yad-dargozashtegan';
const ADMIN_CODE    = process.env.ADMIN_CODE || '1234'; // کد مدیر - توی Render عوضش کن

// وضعیت اتاق در حافظه
const roomState = {
  speakers: new Set(),    // کسانی که اجازه صحبت دارن
  handsUp: new Set(),     // کسانی که دست بلند کردن
  admins: new Set(),      // مدیران
};

// توکن ورود
app.post('/api/token', async (req, res) => {
  const { userName, adminCode } = req.body;
  if (!userName) return res.status(400).json({ error: 'اسم وارد نشده' });

  const isAdmin = adminCode === ADMIN_CODE;
  const canPublish = isAdmin; // فقط مدیر اول میتونه صحبت کنه، بقیه باید اجازه بگیرن

  try {
    const at = new AccessToken(LK_API_KEY, LK_API_SECRET, {
      identity: userName + '_' + Date.now(),
      name: userName,
      ttl: '6h',
    });
    at.addGrant({
      roomJoin: true,
      room: ROOM_NAME,
      canPublish: canPublish,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isAdmin,
    });
    const token = await at.toJwt();

    if (isAdmin) roomState.admins.add(userName);

    res.json({
      token,
      wsUrl: LK_WS_URL,
      roomName: ROOM_NAME,
      isAdmin,
      canPublish,
    });
  } catch (e) {
    console.error('token error:', e);
    res.status(500).json({ error: e.message });
  }
});

// مدیر به کسی اجازه صحبت میده
app.post('/api/allow-speak', (req, res) => {
  const { adminCode, targetIdentity, allow } = req.body;
  if (adminCode !== ADMIN_CODE) return res.status(403).json({ error: 'کد مدیر اشتباهه' });
  if (allow) roomState.speakers.add(targetIdentity);
  else roomState.speakers.delete(targetIdentity);
  res.json({ success: true });
});

// دست بلند کردن
app.post('/api/hand', (req, res) => {
  const { identity, raised } = req.body;
  if (raised) roomState.handsUp.add(identity);
  else roomState.handsUp.delete(identity);
  res.json({ success: true, handsUp: [...roomState.handsUp] });
});

// وضعیت اتاق
app.get('/api/room-state', (req, res) => {
  res.json({
    speakers: [...roomState.speakers],
    handsUp: [...roomState.handsUp],
    admins: [...roomState.admins],
  });
});

// اطلاعات اتاق
app.get('/api/room-info', (req, res) => {
  res.json({
    name: ROOM_NAME,
    title: '🕯️ به یاد درگذشتگان',
    topic: 'فضایی برای یادآوری و دعا برای عزیزانمان',
    wsUrl: LK_WS_URL,
  });
});


// لیست درگذشتگان — مدیر می‌تونه از پنل آپدیت کنه
let deceasedList = [
  'روحش شاد — حاج علی محمدی (۱۳۱۰-۱۳۹۵)',
  'یادش گرامی — مرحومه فاطمه احمدی (۱۳۲۵-۱۴۰۰)',
  'روحشان شاد — حاج حسین رضایی (۱۳۱۸-۱۳۹۸)',
];

// گرفتن لیست
app.get('/api/deceased', (req, res) => {
  res.json({ list: deceasedList });
});

// آپدیت لیست (فقط مدیر)
app.post('/api/deceased', (req, res) => {
  const { adminCode, list } = req.body;
  if (adminCode !== ADMIN_CODE) return res.status(403).json({ error: 'کد مدیر اشتباهه' });
  if (!Array.isArray(list)) return res.status(400).json({ error: 'فرمت اشتباه' });
  deceasedList = list;
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ سرور روی پورت ${PORT} اجرا شد`));
