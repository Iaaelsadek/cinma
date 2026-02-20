
const fs = require('fs');
const path = require('path');

try {
  const envPath = path.resolve('.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n');
    lines.forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim();
        if (key && !key.startsWith('#')) {
          console.log(`${key}: ${val ? 'SET' : 'EMPTY'}`);
        }
      }
    });
  } else {
    console.log('.env file not found');
  }
} catch (err) {
  console.error('Error reading .env:', err);
}
