# Setup Guide: whatsapp-web.js

## 1. Requirements
- **Node.js:** v18.0.0 or higher.
- **Check version:** `node -v`

## 2. Linux Dependencies (No-GUI/Server)
Required for Puppeteer (Headless Chromium) to work on Linux server environments:

```bash
sudo apt update && sudo apt install -y gconf-service libgbm-dev libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

## 3. Project Initialization

```bash
npm init -y
```
```bash
npm install whatsapp-web.js
```

## 4. Video & GIF Support (Codec Caveat)
Chromium (bundled with Puppeteer) does not support licensed AAC and H.264 codecs. To send videos/GIFs, point to a full Chrome installation.

Common Executable Paths:
Linux: /usr/bin/google-chrome-stable
Windows: C:\Program Files\Google\Chrome\Application\chrome.exe
macOS: /Applications/Google Chrome.app/Contents/MacOS/Google Chrome

### Implementation:
```bash
const client = new Client({
    puppeteer: {
        executablePath: '/path/to/chrome',
        args: ['--no-sandbox'] 
    }
});
```