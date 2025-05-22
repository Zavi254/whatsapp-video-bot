# 🤖 WhatsApp Video Downloader Bot

A Node.js-powered WhatsApp bot that downloads videos from Facebook, Instagram, and TikTok links and sends them directly to users via WhatsApp. Built using the [Baileys](https://github.com/adiwajshing/Baileys) library for WhatsApp Web API and hosted serverlessly on [Render](https://render.com).

---

## 🌐 Live Status

📱 To use the bot:
1. Clone the repo
2. Start the server locally or on Render
3. Scan the QR code to link your WhatsApp account
4. Send a Facebook, Instagram, or TikTok video link to get a downloadable video back

---

## 🎯 Features

- ✅ WhatsApp bot powered by `Baileys` (WebSockets)
- 📥 Supports video downloads from:
  - Facebook
  - Instagram
  - TikTok
- ⚡ Automatically extracts video URLs and replies with video file (if under 50MB)
- 🧠 Intelligent platform detection + regex matching
- 🔐 Stores WhatsApp session credentials securely in Supabase Storage
- 🔁 Reconnects automatically if the connection drops
- 🧰 Cronjob-compatible with Render for server spin-up
- 🚨 Graceful error handling (oversized videos, failed links, etc.)

---

## 🔧 Tech Stack

- **Node.js** – Express backend
- **Baileys** – WhatsApp Web API wrapper
- **Supabase** – Storage for persistent auth credentials
- **Axios** – Video streaming and download
- **SnapSaver Downloader** – Fast media fetcher for popular platforms
- **Render** – Hosting and cronjob support
- **dotenv** – Secure env config

---

## 🚀 Quick Start

### 1. Clone this repo
```bash
git clone https://github.com/Zavi254/whatsapp-video-bot.git
cd whatsapp-fb-downloader

```
### 2. Install dependencies
```bash
npm install
```

### 3. Create .env file
```bash
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
SUPABASE_BUCKET=your-bucket-name
```
### 4. Deploy (optional)
```bash
git push origin main
```
