# 🤖 WhatsApp Facebook Video Downloader Bot

A simple Node.js bot that listens for Facebook video links sent on WhatsApp and automatically replies with the downloaded video — no need to switch apps or use Chrome.

Built using the [Baileys](https://github.com/WhiskeySockets/Baileys) WhatsApp Web API.

---

## ✨ Features

- 📥 Detects Facebook video links in WhatsApp messages
- ⚡ Downloads videos automatically using [SnapSaver](https://www.npmjs.com/package/snapsaver-downloader)
- 📤 Replies directly in the same chat with the video file
- 💾 Keeps session alive between restarts using persistent auth
- ☁️ Can be deployed to cloud platforms like [Render](https://render.com)

---

## 🛠 Tech Stack

- Node.js
- [Baileys](https://github.com/WhiskeySockets/Baileys)
- [SnapSaver](https://www.npmjs.com/package/snapsaver-downloader)
- Axios (for downloading video buffers)

---

## 🚀 Setup Instructions

### 1. Clone the repo

```bash
git clone https://github.com/Zavi254/whatsapp-video-bot.git
cd whatsapp-fb-downloader
