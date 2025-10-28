import express from 'express';

const app = express();

// Env var dari Koyeb (set via dashboard/secrets)
const COOKIE_HEADER = process.env.YT_COOKIE;
if (!COOKIE_HEADER) {
  console.error('❌ Error: YT_COOKIE environment variable is required');
  process.exit(1);
}

// Validasi handle: A–Z, 0–9, underscore, titik, dash (sesuai docs handle)
function isValidHandle(h) {
  // Hilangkan awalan @ jika ada
  const handle = h.startsWith('@') ? h.slice(1) : h;
  // Boleh 3–30 karakter (batas praktis), dan hanya [A-Za-z0-9._-]
  return /^[A-Za-z0-9._-]{3,30}$/.test(handle);
}

// GET /@:handle  → redirect ke .m3u8 jika live ditemukan
app.get('/@:handle', async (req, res) => {
  // Express menangkap tanpa '@', tambahkan jika perlu saat membuat URL
  const raw = req.params.handle || '';
  const handle = raw.startsWith('@') ? raw : `@${raw}`;

  if (!isValidHandle(handle)) {
    return res.status(400).send('Invalid handle format');
  }

  // Kunjungi halaman live milik handle
  const url = `https://www.youtube.com/${handle}/live`;

  try {
    const response = await fetch(url, {
      headers: {
        'Cookie': COOKIE_HEADER,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error(`YouTube error: ${response.status} for handle ${handle}`);
      return res.status(response.status).send(`YouTube error: ${response.status}`);
    }

    const html = await response.text();

    // Ekstrak hlsManifestUrl dari playerResponse di HTML
    const match = html.match(/"hlsManifestUrl":"([^"]+\.m3u8[^"]*)"/);
    if (match && match[1]) {
      const manifestUrl = match[1].replace(/\\u0026/g, '&');
      res.setHeader('Cache-Control', 'private, max-age=30');
      return res.redirect(302, manifestUrl);
    }

    console.warn(`No m3u8 found for handle ${handle}`);
    return res.status(404).send('No HLS manifest found');
  } catch (err) {
    console.error(`Fetch error for ${handle}:`, err.message);
    return res.status(500).send('Internal server error');
  }
});

// Health check
app.get('/health', (req, res) => res.send('OK'));

// 404 fallback
app.use((req, res) => res.status(404).send('Endpoint not found'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📦 Node.js version: ${process.version}`);
});
