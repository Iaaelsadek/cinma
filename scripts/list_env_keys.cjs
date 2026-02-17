const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  console.log('Environment Variables in .env:');
  lines.forEach(line => {
    const match = line.match(/^([^=]+)=/);
    if (match) {
      console.log(`- ${match[1]}`);
    }
  });
} else {
  console.log('.env file not found!');
}
