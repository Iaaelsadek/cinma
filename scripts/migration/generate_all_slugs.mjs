
import { generateSlugsForTable } from '../../src/lib/db.ts';

async function generateAllSlugs() {
  const tables = ['movies', 'tv_series', 'games', 'software', 'actors'];
  let totalGenerated = 0;

  console.log('🚀 Starting slug generation for all tables...');

  for (const table of tables) {
    try {
      console.log(`\n📦 Processing table: ${table}...`);
      let tableTotal = 0;
      let batchCount = 0;
      
      // Process in batches until no more items without slugs
      while (true) {
        const count = await generateSlugsForTable(table);
        if (count === -1) {
          console.error(`❌ Error occurred while generating slugs for ${table}`);
          break;
        }
        if (count === 0) {
          console.log(`✅ No more items without slugs in ${table}`);
          break;
        }
        
        tableTotal += count;
        batchCount++;
        console.log(`   - Batch ${batchCount}: Generated ${count} slugs (Total for ${table}: ${tableTotal})`);
      }
      
      totalGenerated += tableTotal;
    } catch (err) {
      console.error(`❌ Fatal error processing ${table}:`, err.message);
    }
  }

  console.log(`\n✨ Finished! Total slugs generated across all tables: ${totalGenerated}`);
}

generateAllSlugs().catch(err => {
  console.error('💥 Unhandled error in script:', err);
  process.exit(1);
});
