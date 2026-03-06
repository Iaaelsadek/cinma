
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env manually
const envPath = path.resolve(__dirname, '../.env')
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8')
  envConfig.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=')
    if (key && rest) {
      let val = rest.join('=').trim()
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1)
      process.env[key.trim()] = val
    }
  })
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing ENV variables: SUPABASE_URL/KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const UPDATES = [
    { title: 'Visual Studio Code', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/9/9a/Visual_Studio_Code_1.35_icon.svg' },
    { title: 'Adobe Photoshop 2024', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/a/af/Adobe_Photoshop_CC_icon.svg' },
    { title: 'Google Chrome', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Google_Chrome_icon_%28February_2022%29.svg' },
    { title: 'VLC Media Player', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/VLC_Icon.svg' },
    { title: 'Discord', poster_url: 'https://assets-global.website-files.com/6257adef93867e56f84d3092/636e0a6a49cf127bf92de1e2_icon_clyde_blurple_RGB.png' },
    { title: 'Git', poster_url: 'https://www.vectorlogo.zone/logos/git-scm/git-scm-icon.svg' },
    { title: '7-Zip', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/7/77/7-Zip_19.00_icon.svg' },
    { title: 'WinRAR', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/b/bc/WinRAR_Logo.png' },
    { title: 'Steam', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/8/83/Steam_icon_logo.svg' },
    { title: 'Node.js', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Node.js_logo.svg' },
    { title: 'Docker Desktop', poster_url: 'https://www.docker.com/wp-content/uploads/2022/03/vertical-logo-monochromatic.png' }, // Keep or find better
    { title: 'Postman', poster_url: 'https://www.vectorlogo.zone/logos/getpostman/getpostman-icon.svg' },
    { title: 'Figma', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/3/33/Figma-logo.svg' },
    { title: 'Blender', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/0/0c/Blender_logo_no_text.svg' },
    { title: 'GIMP', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/4/45/The_GIMP_icon_-_gnome.svg' },
    { title: 'OBS Studio', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/OBS_Studio_Logo.svg' },
    { title: 'Telegram Desktop', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg' },
    { title: 'WhatsApp Desktop', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg' },
    { title: 'Microsoft Office 2021', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Microsoft_Office_logo_%282019%E2%80%93present%29.svg' },
    { title: 'Premiere Pro 2024', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/4/40/Adobe_Premiere_Pro_CC_icon.svg' },
    { title: 'Mozilla Firefox', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Firefox_logo%2C_2019.svg' },
    { title: 'Brave', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Brave_lion_icon.svg' },
    { title: 'PuTTY', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/8/82/Putty_icon.svg' },
    { title: 'Notion', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Notion_app_logo.png' },
    { title: 'PyCharm Community', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/1/1d/PyCharm_Icon.svg' },
    { title: 'PotPlayer', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/d/d7/PotPlayer_logo.png' }, // Not SVG but decent
    { title: 'WinSCP', poster_url: 'https://winscp.net/eng/images/logo.png' },
    { title: 'Internet Download Manager', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Internet_Download_Manager_logo.png' },
    { title: 'Everything Search', poster_url: 'https://www.voidtools.com/Everything-1.5a.png' },
    { title: 'qBittorrent', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/6/66/QBittorrent_Logo.svg' },
    { title: 'Obsidian', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/1/10/2023_Obsidian_logo.svg' },
    { title: 'Microsoft PowerToys', poster_url: 'https://upload.wikimedia.org/wikipedia/commons/e/ed/PowerToys_Icon.svg' }
]

async function updateSoftwareIcons() {
    console.log("🚀 Updating Software Icons...")
    
    for (const item of UPDATES) {
        const { error } = await supabase
            .from('software')
            .update({ poster_url: item.poster_url })
            .eq('title', item.title)
        
        if (error) {
            console.error(`❌ Error updating ${item.title}:`, error.message)
        } else {
            console.log(`✅ Updated: ${item.title}`)
        }
    }
}

updateSoftwareIcons()
