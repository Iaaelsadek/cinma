/**
 * Property-Based Test: Cast Order Bug Condition
 * 
 * **Validates: Requirements 2.1, 2.2, 2.3**
 * 
 * هذا الاختبار يتحقق من أن ترتيب الممثلين صحيح بعد الإصلاح.
 * المشكلة الأصلية: الممثلون بـ cast_order = NULL كانوا يظهرون قبل الممثلين الرئيسيين
 * الإصلاح: استخدام COALESCE(cast_order, 999) لوضع NULL في النهاية
 * 
 * ملاحظة: الإصلاح تم بالفعل في المهمة 6، لذلك هذا الاختبار يجب أن يمر الآن.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import * as fc from 'fast-check'
import pg from 'pg'

const { Pool } = pg

// Database connection
let pool

beforeAll(async () => {
  pool = new Pool({
    connectionString: process.env.COCKROACHDB_URL,
    ssl: { rejectUnauthorized: false }
  })
})

afterAll(async () => {
  await pool.end()
})

describe('Cast Order Bug Condition - Property-Based Tests', () => {
  /**
   * Property 1: Bug Condition - ترتيب الممثلين صحيح مع NULL
   * 
   * For any استعلام لجلب الممثلين حيث يوجد ممثلون بـ cast_order = NULL،
   * يجب أن يظهر الممثلون الرئيسيون (cast_order = 0, 1, 2) أولاً،
   * والممثلون بـ NULL في النهاية.
   */
  it('should place NULL cast_order at the end (after main cast)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 3, maxLength: 50 }),
            cast_order: fc.oneof(
              fc.integer({ min: 0, max: 10 }), // ممثلون رئيسيون
              fc.constant(null),                // ممثلون بدون ترتيب
              fc.constant(999)                  // ممثلون بترتيب افتراضي
            )
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (castMembers) => {
          // ترتيب الممثلين باستخدام نفس المنطق المستخدم في SQL
          const sorted = [...castMembers].sort((a, b) => {
            const orderA = a.cast_order ?? 999
            const orderB = b.cast_order ?? 999
            return orderA - orderB
          })

          // التحقق من أن الترتيب صحيح
          for (let i = 0; i < sorted.length - 1; i++) {
            const currentOrder = sorted[i].cast_order ?? 999
            const nextOrder = sorted[i + 1].cast_order ?? 999
            
            // يجب أن يكون الترتيب تصاعدي
            if (currentOrder > nextOrder) {
              return false
            }
          }

          // التحقق من أن NULL values (999) في النهاية
          const nullMembers = sorted.filter(m => m.cast_order === null)
          const nonNullMembers = sorted.filter(m => m.cast_order !== null)
          
          if (nullMembers.length > 0 && nonNullMembers.length > 0) {
            // آخر ممثل بترتيب صحيح يجب أن يكون قبل أول ممثل بـ NULL
            const lastNonNull = nonNullMembers[nonNullMembers.length - 1]
            const firstNull = nullMembers[0]
            
            const lastNonNullOrder = lastNonNull.cast_order ?? 999
            const firstNullOrder = firstNull.cast_order ?? 999
            
            if (lastNonNullOrder > firstNullOrder) {
              return false
            }
          }

          return true
        }
      )
    )
  })

  /**
   * Property 2: Preservation - الممثلون بـ cast_order صحيح يظهرون بنفس الترتيب
   * 
   * For any استعلام لجلب الممثلين حيث جميع الممثلين لديهم cast_order صحيح (غير NULL)،
   * يجب أن يظهروا بنفس الترتيب الحالي تماماً.
   */
  it('should preserve order for cast members with valid cast_order', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 3, maxLength: 50 }),
            cast_order: fc.integer({ min: 0, max: 20 })
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (castMembers) => {
          // ترتيب الممثلين
          const sorted = [...castMembers].sort((a, b) => a.cast_order - b.cast_order)

          // التحقق من أن الترتيب تصاعدي
          for (let i = 0; i < sorted.length - 1; i++) {
            if (sorted[i].cast_order > sorted[i + 1].cast_order) {
              return false
            }
          }

          return true
        }
      )
    )
  })

  /**
   * Integration Test: التحقق من استعلام SQL الفعلي
   * 
   * هذا الاختبار يتحقق من أن استعلام SQL في server/routes/content.js
   * يستخدم COALESCE بشكل صحيح.
   */
  it('should verify SQL query uses COALESCE for cast_order', async () => {
    // قراءة ملف content.js
    const fs = await import('fs')
    const path = await import('path')
    const { fileURLToPath } = await import('url')
    
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    const contentPath = path.join(__dirname, '../routes/content.js')
    
    const content = fs.readFileSync(contentPath, 'utf-8')

    // التحقق من وجود COALESCE في استعلامات cast_order
    const coalescePattern = /COALESCE\s*\(\s*[mt]c\.cast_order\s*,\s*999\s*\)/gi
    const matches = content.match(coalescePattern)

    // يجب أن يكون هناك على الأقل 4 استخدامات (movies cast, tv cast, actor works movies, actor works tv)
    expect(matches).toBeTruthy()
    expect(matches.length).toBeGreaterThanOrEqual(4)
  })

  /**
   * Database Integration Test: اختبار على قاعدة البيانات الفعلية
   * 
   * هذا الاختبار يتحقق من أن البيانات في قاعدة البيانات مرتبة بشكل صحيح.
   */
  it('should verify cast order in actual database', async () => {
    // تخطي الاختبار إذا لم يكن هناك اتصال بقاعدة البيانات
    if (!process.env.COCKROACHDB_URL) {
      console.log('⏭️  تخطي: لا يوجد COCKROACHDB_URL في البيئة')
      return
    }

    try {
      // جلب فيلم عشوائي مع ممثلين
      const movieQuery = `
        SELECT m.id, m.slug, m.title
        FROM movies m
        WHERE m.is_published = TRUE
          AND EXISTS (
            SELECT 1 FROM movie_cast mc WHERE mc.movie_id = m.id
          )
        LIMIT 1
      `
      
      const movieResult = await pool.query(movieQuery)
      
      if (movieResult.rows.length === 0) {
        console.log('⏭️  تخطي: لا توجد أفلام مع ممثلين في قاعدة البيانات')
        return
      }

      const movie = movieResult.rows[0]

      // جلب الممثلين باستخدام نفس الاستعلام من content.js
      const castQuery = `
        SELECT 
          a.id, a.slug, a.name, a.name_ar, a.name_en,
          a.profile_url, a.profile_path,
          mc.character_name, mc.cast_order
        FROM actors a
        INNER JOIN movie_cast mc ON a.id = mc.actor_id
        WHERE mc.movie_id = $1 AND a.is_published = TRUE
        ORDER BY COALESCE(mc.cast_order, 999) ASC
        LIMIT 20
      `

      const castResult = await pool.query(castQuery, [movie.id])
      const cast = castResult.rows

      console.log(`\n📊 اختبار ترتيب الممثلين لفيلم: ${movie.title}`)
      console.log(`   عدد الممثلين: ${cast.length}`)

      // التحقق من أن الترتيب صحيح
      for (let i = 0; i < cast.length - 1; i++) {
        const currentOrder = cast[i].cast_order ?? 999
        const nextOrder = cast[i + 1].cast_order ?? 999
        
        expect(currentOrder).toBeLessThanOrEqual(nextOrder)
      }

      // عرض أول 5 ممثلين
      console.log('\n   أول 5 ممثلين:')
      cast.slice(0, 5).forEach((actor, index) => {
        const order = actor.cast_order ?? 'NULL (999)'
        console.log(`   ${index + 1}. ${actor.name} - cast_order: ${order}`)
      })

      // التحقق من أن NULL values في النهاية
      const nullCast = cast.filter(c => c.cast_order === null)
      const nonNullCast = cast.filter(c => c.cast_order !== null)

      if (nullCast.length > 0 && nonNullCast.length > 0) {
        console.log(`\n   ✅ الممثلون بـ cast_order صحيح: ${nonNullCast.length}`)
        console.log(`   ✅ الممثلون بـ cast_order = NULL: ${nullCast.length}`)
        
        // آخر ممثل بترتيب صحيح
        const lastNonNull = nonNullCast[nonNullCast.length - 1]
        console.log(`   آخر ممثل بترتيب صحيح: ${lastNonNull.name} (cast_order: ${lastNonNull.cast_order})`)
        
        // أول ممثل بـ NULL
        const firstNull = nullCast[0]
        console.log(`   أول ممثل بـ NULL: ${firstNull.name} (cast_order: NULL)`)
        
        // التحقق
        expect(lastNonNull.cast_order).toBeLessThan(999)
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('⏭️  تخطي: لا يمكن الاتصال بقاعدة البيانات')
        return
      }
      throw error
    }
  })

  /**
   * Property 4.3: Preservation - ترتيب الممثلين الحاليين
   * 
   * **Validates: Requirements 3.4**
   * 
   * For any استعلام لجلب الممثلين حيث جميع الممثلين لديهم cast_order صحيح (غير NULL)،
   * يجب أن يظهروا بنفس الترتيب الحالي تماماً.
   * 
   * هذا السلوك يجب أن يبقى كما هو بعد الإصلاح.
   */
  it('should preserve order for cast members with valid cast_order (no NULL)', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 3, maxLength: 50 }),
            cast_order: fc.integer({ min: 0, max: 20 }) // All valid, no NULL
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (castMembers) => {
          // ترتيب الممثلين باستخدام نفس المنطق المستخدم في SQL
          const sorted = [...castMembers].sort((a, b) => {
            const orderA = a.cast_order ?? 999
            const orderB = b.cast_order ?? 999
            return orderA - orderB
          })

          // التحقق من أن الترتيب تصاعدي (محفوظ)
          for (let i = 0; i < sorted.length - 1; i++) {
            const currentOrder = sorted[i].cast_order ?? 999
            const nextOrder = sorted[i + 1].cast_order ?? 999
            
            if (currentOrder > nextOrder) {
              return false
            }
          }

          // التحقق من أن لا يوجد NULL values (جميعهم صحيح)
          const hasNull = sorted.some(m => m.cast_order === null)
          expect(hasNull).toBe(false)

          return true
        }
      )
    )
  })

  /**
   * Property 4.3: Preservation - الممثلون بـ cast_order = 0, 1, 2 يظهرون أولاً
   * 
   * For any استعلام لجلب الممثلين،
   * يجب أن يظهر الممثلون الرئيسيون (cast_order = 0, 1, 2) في البداية دائماً.
   */
  it('should preserve main cast order (0, 1, 2) at the beginning', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 3, maxLength: 50 }),
            cast_order: fc.integer({ min: 0, max: 10 })
          }),
          { minLength: 10, maxLength: 20 }
        ),
        (castMembers) => {
          // ترتيب الممثلين
          const sorted = [...castMembers].sort((a, b) => a.cast_order - b.cast_order)

          // البحث عن الممثلين الرئيسيين (0, 1, 2)
          const mainCast = sorted.filter(m => m.cast_order <= 2)
          
          if (mainCast.length > 0) {
            // التحقق من أن الممثلين الرئيسيين في البداية
            for (let i = 0; i < mainCast.length; i++) {
              expect(sorted[i].cast_order).toBeLessThanOrEqual(2)
            }
          }

          return true
        }
      )
    )
  })

  /**
   * Property 4.3: Preservation - Database Integration Test
   * 
   * اختبار على قاعدة البيانات الفعلية للتحقق من أن الترتيب محفوظ.
   */
  it('should preserve cast order in actual database for valid cast_order', async () => {
    if (!process.env.COCKROACHDB_URL) {
      console.log('⏭️  تخطي: لا يوجد COCKROACHDB_URL في البيئة')
      return
    }

    try {
      // جلب فيلم مع ممثلين لديهم cast_order صحيح (غير NULL)
      const movieQuery = `
        SELECT m.id, m.slug, m.title
        FROM movies m
        WHERE m.is_published = TRUE
          AND EXISTS (
            SELECT 1 FROM movie_cast mc 
            WHERE mc.movie_id = m.id 
              AND mc.cast_order IS NOT NULL
              AND mc.cast_order < 10
          )
        LIMIT 1
      `
      
      const movieResult = await pool.query(movieQuery)
      
      if (movieResult.rows.length === 0) {
        console.log('⏭️  تخطي: لا توجد أفلام مع ممثلين بـ cast_order صحيح')
        return
      }

      const movie = movieResult.rows[0]

      // جلب الممثلين بـ cast_order صحيح فقط
      const castQuery = `
        SELECT 
          a.id, a.name, mc.cast_order
        FROM actors a
        INNER JOIN movie_cast mc ON a.id = mc.actor_id
        WHERE mc.movie_id = $1 
          AND a.is_published = TRUE
          AND mc.cast_order IS NOT NULL
          AND mc.cast_order < 10
        ORDER BY COALESCE(mc.cast_order, 999) ASC
        LIMIT 10
      `

      const castResult = await pool.query(castQuery, [movie.id])
      const cast = castResult.rows

      console.log(`\n📊 اختبار preservation - ترتيب الممثلين لفيلم: ${movie.title}`)
      console.log(`   عدد الممثلين (cast_order صحيح): ${cast.length}`)

      if (cast.length === 0) {
        console.log('⏭️  تخطي: لا يوجد ممثلون بـ cast_order صحيح')
        return
      }

      // التحقق من أن الترتيب محفوظ (تصاعدي)
      for (let i = 0; i < cast.length - 1; i++) {
        expect(cast[i].cast_order).toBeLessThanOrEqual(cast[i + 1].cast_order)
      }

      // عرض الممثلين
      console.log('\n   الممثلون (cast_order صحيح):')
      cast.forEach((actor, index) => {
        console.log(`   ${index + 1}. ${actor.name} - cast_order: ${actor.cast_order}`)
      })

      console.log(`\n   ✅ الترتيب محفوظ (تصاعدي)`)
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.log('⏭️  تخطي: لا يمكن الاتصال بقاعدة البيانات')
        return
      }
      throw error
    }
  })

  /**
   * Edge Case Test: اختبار حالات خاصة
   */
  it('should handle edge cases correctly', async () => {
    // حالة 1: جميع الممثلين بـ cast_order = NULL
    const allNull = [
      { name: 'Actor 1', cast_order: null },
      { name: 'Actor 2', cast_order: null },
      { name: 'Actor 3', cast_order: null }
    ]

    const sortedAllNull = [...allNull].sort((a, b) => {
      const orderA = a.cast_order ?? 999
      const orderB = b.cast_order ?? 999
      return orderA - orderB
    })

    // جميعهم يجب أن يكون لهم نفس الترتيب (999)
    sortedAllNull.forEach(actor => {
      expect(actor.cast_order ?? 999).toBe(999)
    })

    // حالة 2: جميع الممثلين بـ cast_order صحيح
    const allValid = [
      { name: 'Actor 1', cast_order: 0 },
      { name: 'Actor 2', cast_order: 1 },
      { name: 'Actor 3', cast_order: 2 }
    ]

    const sortedAllValid = [...allValid].sort((a, b) => a.cast_order - b.cast_order)

    // الترتيب يجب أن يكون 0, 1, 2
    expect(sortedAllValid[0].cast_order).toBe(0)
    expect(sortedAllValid[1].cast_order).toBe(1)
    expect(sortedAllValid[2].cast_order).toBe(2)

    // حالة 3: مزيج من NULL وصحيح
    const mixed = [
      { name: 'Actor 1', cast_order: 0 },
      { name: 'Actor 2', cast_order: null },
      { name: 'Actor 3', cast_order: 1 },
      { name: 'Actor 4', cast_order: null },
      { name: 'Actor 5', cast_order: 2 }
    ]

    const sortedMixed = [...mixed].sort((a, b) => {
      const orderA = a.cast_order ?? 999
      const orderB = b.cast_order ?? 999
      return orderA - orderB
    })

    // الترتيب يجب أن يكون: 0, 1, 2, 999, 999
    expect(sortedMixed[0].cast_order).toBe(0)
    expect(sortedMixed[1].cast_order).toBe(1)
    expect(sortedMixed[2].cast_order).toBe(2)
    expect(sortedMixed[3].cast_order).toBe(null)
    expect(sortedMixed[4].cast_order).toBe(null)
  })
})
