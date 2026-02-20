
const fs = require('fs');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
console.log('Checking environment variables...');
const keys = [
  'SUPABASE_SERVICE_ROLE',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_SERVICE_ROLE',
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_KEY',
  'VITE_SUPABASE_ANON_KEY'
];

keys.forEach(key => {
  if (process.env[key]) {
    console.log(`${key}: Exists (Length: ${process.env[key].length})`);
  } else {
    console.log(`${key}: Missing`);
  }
});
