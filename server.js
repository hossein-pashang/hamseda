const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const DAILY_API_KEY = process.env.DAILY_API_KEY || 'YOUR_DAILY_API_KEY_HERE';
const DAILY_API = 'https://api.daily.co/v1';

// ساخت اتاق جدید
app.post('/api/create-room', async (req, res) => {
  const { roomName, title, topic } = req.body;
  const name = roomName || 'room-' + Date.now();

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
          start_audio_off: true, // میکروفون پیش‌فرض خاموش
          exp: Math.round(Date.now() / 1000) + 60 * 60 * 4, // 4 ساعت
        },
      }),
    });

    const room = await response.json();
    if (!response.ok) return res.status(400).json({ error: room.error });

    // ذخیره اطلاعات اضافه در حافظه
    rooms[room.name] = { title, topic, createdAt: Date.now(), listeners: 0 };

    res.json({ name: room.name, url: room.url });
  } catch (err) {
    res.status(500).json({ error: 'خطا در ساخت اتاق' });
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
          user_name: userName,
          is_owner: false,
          start_audio_off: !isSpeaker,
          enable_screenshare: false,
        },
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(400).json({ error: data.error });

    res.json({ token: data.token });
  } catch (err) {
    res.status(500).json({ error: 'خطا در ورود به اتاق' });
  }
});

// لیست اتاق‌های فعال
app.get('/api/rooms', async (req, res) => {
  try {
    const response = await fetch(`${DAILY_API}/rooms`, {
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    const data = await response.json();
    const activeRooms = (data.data || []).map((r) => ({
      name: r.name,
      url: r.url,
      title: rooms[r.name]?.title || r.name,
      topic: rooms[r.name]?.topic || '',
      createdAt: rooms[r.name]?.createdAt || 0,
    }));
    res.json(activeRooms);
  } catch (err) {
    res.status(500).json({ error: 'خطا در دریافت اتاق‌ها' });
  }
});

// حذف اتاق
app.delete('/api/rooms/:name', async (req, res) => {
  const { name } = req.params;
  try {
    await fetch(`${DAILY_API}/rooms/${name}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
    delete rooms[name];
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'خطا در حذف اتاق' });
  }
});

const rooms = {}; // حافظه موقت — در پروژه واقعی از دیتابیس استفاده کن

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ سرور روی پورت ${PORT} اجرا شد`));
