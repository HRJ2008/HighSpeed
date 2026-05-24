# HighSpeed Internet Speed Test

A modern internet speed test website made with HTML, CSS, JavaScript, Node.js, and Express.js.

## Features

- Ping measurement
- Jitter measurement
- Real download speed test
- Real upload speed test
- 10 MB, 25 MB, 50 MB, and 100 MB test sizes
- Random background themes
- Cloudflare Pages frontend support
- Render backend support

## Live Backend

Render backend URL:

```txt
https://highspeed-8hm4.onrender.com
```

Health check:

```txt
https://highspeed-8hm4.onrender.com/api/health
```

## Run Locally

```bash
npm install
npm start
```

Open:

```txt
http://localhost:3000
```

## Cloudflare Pages Settings

Use Cloudflare Pages for the frontend only.

```txt
Framework preset: None
Build command: npm install
Build output directory: public
Root directory: leave blank
```

The frontend automatically uses the Render backend when it is not running on localhost.

## API Endpoints

```txt
GET  /api/health
GET  /api/ping
GET  /api/download?size=25
POST /api/upload
```

## Important

Speed test results measure the connection between the user's device and the backend server.
The result depends on server location, server bandwidth, network congestion, and the user's device connection.
