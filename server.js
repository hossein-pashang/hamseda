const express = require('express');
const { AccessToken } = require('livekit-server-sdk');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const LK_API_KEY    = process.env.LK_API_KEY    || 'APIdN3BFb5uq8vR';
const LK_API_SECRET = process.env.LK_API_SECRET || 'NvTIlRgHftjjYKef53beJX4tZcfCXAj93hKHyOLZVLfC';
const LK_WS_URL     = process.env.LK_WS_URL     || 'wss://hamseda-rutlgpu6.livekit.cloud';
const ROOM_NAME     = 'be-yad-dargozashtegan';

// توکن ورود به اتاق
app.post('/api/token', async (req, res) => {
  const { userName } = req.body;
  if (!userName) return res.status(400).json({ error: 'اسم وارد نشده' });

  try {
    const at = new AccessToken(LK_API_KEY, LK_API_SECRET, {
      identity: userName + '_' + Date.now(),
      name: userName,
      ttl: '4h',
    });
    at.addGrant({
      roomJoin: true,
      room: ROOM_NAME,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    const token = await at.toJwt();
    res.json({ token, wsUrl: LK_WS_URL, roomName: ROOM_NAME });
  } catch (e) {
    console.error('token error:', e);
    res.status(500).json({ error: e.message });
  }
});

// اطلاعات اتاق ثابت
app.get('/api/room-info', (req, res) => {
  res.json({
    name: ROOM_NAME,
    title: '🕯️ به یاد درگذشتگان',
    topic: 'فضایی برای یادآوری و دعا برای عزیزانمان',
    wsUrl: LK_WS_URL,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ سرور روی پورت ${PORT} اجرا شد`));
