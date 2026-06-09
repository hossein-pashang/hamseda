const express = require('express');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_DOMAIN = process.env.DAILY_DOMAIN || 'haseda'; // نام دامنه Daily تو
const DAILY_API = 'https://api.daily.co/v1';

// چک کردن کلید هنگام شروع
if (!DAILY_API_KEY) {
  console.error('❌ خطا: DAILY_API_KEY تنظیم نشده!');
}

// تست اتصال به Daily
async function testDailyConnection() {
  try {
    const res = await fetch(`${DAILY_API}/rooms`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    if (res.ok) {
      console.log('✅ اتصال به Daily.co برقرار شد');
    } else {
      const err = await res.json();
      console.error('❌ خطای Daily API:', err);
    }
  } catch (e) {
    console.error('❌ خطای شبکه:', e.message);
  }
}

// ساخت اتاق جدید
app.post('/api/create-room', async (req, res) => {
  const { title, topic } = req.body;
  const name = 'room-' + Date.now();

  try {
    const response = await fetch(`${DAILY_API}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name,
        properties: {
          enable_chat: false,
          enable_screenshare: false,
          enable_video_processing_ui: false,
          start_audio_off: true,
          exp: Math.round(Date.now() / 1000) + 60 * 60 * 6,
        },
      }),
    });

    const room = await response.json();
    console.log('Daily create-room response:', JSON.stringify(room));

    if (!response.ok) {
      return res.status(400).json({ error: room.error || 'خطا در ساخت اتاق' });
    }

    rooms[room.name] = { title, topic, createdAt: Date.now() };
    res.json({ name: room.name, url: room.url });
  } catch (err) {
    console.error('create-room error:', err);
    res.status(500).json({ error: err.message });
  }
});

// توکن ورود به اتاق
app.post('/api/join-room', async (req, res) => {
  const { roomName, userName, isSpeaker } = req.body;

  try {
    const response = await fetch(`${DAILY_API}/meeting-tokens`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: userName || 'مهمان',
          start_audio_off: !isSpeaker,
        },
      }),
    });

    const data = await response.json();
    console.log('Daily meeting-token response:', JSON.stringify(data));

    if (!response.ok) {
      return res.status(400).json({ error: data.error || 'خطا در گرفتن توکن' });
    }

    res.json({ token: data.token });
  } catch (err) {
    console.error('join-room error:', err);
    res.status(500).json({ error: err.message });
  }
});

// لیست اتاق‌های فعال
app.get('/api/rooms', async (req, res) => {
  try {
    const response = await fetch(`${DAILY_API}/rooms`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    const data = await response.json();
    console.log('Daily rooms response:', JSON.stringify(data));

    if (!response.ok) {
      return res.status(400).json({ error: data.error || 'خطا در دریافت اتاق‌ها' });
    }

    const activeRooms = (data.data || []).map((r) => ({
      name: r.name,
      url: r.url,
      title: rooms[r.name]?.title || r.name,
      topic: rooms[r.name]?.topic || '',
    }));
    res.json(activeRooms);
  } catch (err) {
    console.error('rooms error:', err);
    res.status(500).json({ error: err.message });
  }
});

// حذف اتاق
app.delete('/api/rooms/:name', async (req, res) => {
  try {
    await fetch(`${DAILY_API}/rooms/${req.params.name}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    delete rooms[req.params.name];
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const rooms = {};
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ سرور روی پورت ${PORT} اجرا شد`);
  testDailyConnection();
});
