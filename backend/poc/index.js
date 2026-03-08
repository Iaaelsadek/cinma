const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  console.log('[*] Launching Stealth Browser...');
  const browser = await puppeteer.launch({
    headless: "new", 
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const page = await browser.newPage();
  
  // Set realistic User-Agent
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

  // Intercept requests to find media
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    request.continue();
    
    // Check for media
    if (url.includes('.m3u8') || url.includes('.mp4')) {
      console.log(`\n[+] SUCCESS: Found Media Link: ${url}`);
    }
  });

  try {
    const target = 'https://vidsrc.to/embed/movie/157336';
    console.log(`[*] Navigating to ${target}`);
    
    // Go to page
    await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60000 });
    console.log('[*] Page loaded. Waiting for iframes...');

    // Wait for frames
    await page.waitForTimeout(5000);
    
    const frames = page.frames();
    console.log(`[*] Frames found: ${frames.length}`);
    for (const frame of frames) {
        console.log(`    - ${frame.url()}`);
        // Try to click inside frame if it's the player
        if (frame.url().includes('vsembed') || frame.url().includes('pro')) {
            console.log(`[*] Found Player Frame: ${frame.url()}`);
            // We might need to navigate specifically to this frame URL to interact better?
            // Or evaluate script inside it.
        }
    }

    // Try to find the big play button or overlay
    // Usually .play-btn or similar
    console.log('[*] Looking for play buttons...');
    
    // Try blindly clicking center
    await page.mouse.click(page.viewport().width / 2, page.viewport().height / 2);
    console.log('[*] Clicked center.');
    
    await page.waitForTimeout(3000);

    // Click again
    await page.mouse.click(page.viewport().width / 2, page.viewport().height / 2);
    console.log('[*] Clicked center again.');
    
    await page.waitForTimeout(10000);

  } catch (error) {
    console.error(`[!] Error: ${error}`);
  } finally {
    console.log('[*] Done.');
    await browser.close();
  }
})();
