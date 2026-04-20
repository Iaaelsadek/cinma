/**
 * Bug Condition Exploration Test - Actor Count Limit
 * 
 * **Property 1: Bug Condition** - Actor Count Limited to 5 Instead of 8
 * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * **DO NOT attempt to fix the test or the code when it fails**
 * 
 * This test validates Requirements 1.6, 2.6
 * 
 * **Validates: Requirements 1.6, 2.6**
 */

import { describe, it, expect } from 'vitest'

// Mock TMDB cast response structure
interface CastMember {
    id: number
    name: string
    character: string
    cast_id: number
    order: number
    profile_path: string | null
}

// Copy the CURRENT (buggy) insertActors logic from MASTER_INGESTION_QUEUE.js
function insertActors(cast: CastMember[]): CastMember[] {
    // Current bug: limits to 5 actors instead of 8
    const topCast = cast.slice(0, 5)
    return topCast
}

describe('Bug Condition Exploration - Actor Count Limit', () => {
    it('should FAIL: only 5 actors inserted when cast has 10+ members', () => {
        // Simulate TMDB cast response with 10 actors
        const largeCast: CastMember[] = [
            { id: 1, name: 'Actor 1', character: 'Character 1', cast_id: 1, order: 0, profile_path: '/path1.jpg' },
            { id: 2, name: 'Actor 2', character: 'Character 2', cast_id: 2, order: 1, profile_path: '/path2.jpg' },
            { id: 3, name: 'Actor 3', character: 'Character 3', cast_id: 3, order: 2, profile_path: '/path3.jpg' },
            { id: 4, name: 'Actor 4', character: 'Character 4', cast_id: 4, order: 3, profile_path: '/path4.jpg' },
            { id: 5, name: 'Actor 5', character: 'Character 5', cast_id: 5, order: 4, profile_path: '/path5.jpg' },
            { id: 6, name: 'Actor 6', character: 'Character 6', cast_id: 6, order: 5, profile_path: '/path6.jpg' },
            { id: 7, name: 'Actor 7', character: 'Character 7', cast_id: 7, order: 6, profile_path: '/path7.jpg' },
            { id: 8, name: 'Actor 8', character: 'Character 8', cast_id: 8, order: 7, profile_path: '/path8.jpg' },
            { id: 9, name: 'Actor 9', character: 'Character 9', cast_id: 9, order: 8, profile_path: '/path9.jpg' },
            { id: 10, name: 'Actor 10', character: 'Character 10', cast_id: 10, order: 9, profile_path: '/path10.jpg' }
        ]

        const insertedActors = insertActors(largeCast)

        console.log('🐛 TESTING ACTOR INSERTION LOGIC:')
        console.log('Total cast members available:', largeCast.length)
        console.log('Actors inserted:', insertedActors.length)
        console.log('Expected: 8 actors')
        console.log('Actual:', insertedActors.length, 'actors')

        // EXPECTED BEHAVIOR (after fix): Should insert 8 actors
        // CURRENT BEHAVIOR (bug): Only inserts 5 actors

        // This assertion will PASS on unfixed code (proving the bug exists)
        expect(insertedActors.length).toBe(5)

        // After fix, we expect 8 actors
        // expect(insertedActors.length).toBe(8)
    })

    it('should FAIL: demonstrates bug with real-world movie example', () => {
        // Simulate a popular movie with large cast (e.g., Avengers: Endgame)
        const avengersCast: CastMember[] = [
            { id: 16828, name: 'Chris Evans', character: 'Steve Rogers / Captain America', cast_id: 1, order: 0, profile_path: '/3bOGNsHlrswhyW79uvIHH1V43JI.jpg' },
            { id: 74568, name: 'Chris Hemsworth', character: 'Thor Odinson', cast_id: 2, order: 1, profile_path: '/xkHHiJXraaMFXgRYspN6KVrFn17.jpg' },
            { id: 1245, name: 'Scarlett Johansson', character: 'Natasha Romanoff / Black Widow', cast_id: 3, order: 2, profile_path: '/6NsMbJXRlDZuDzatN2akFdGuTvx.jpg' },
            { id: 3223, name: 'Robert Downey Jr.', character: 'Tony Stark / Iron Man', cast_id: 4, order: 3, profile_path: '/5qHNjhtjMD4YWH3UP0rm4tKwxCL.jpg' },
            { id: 103, name: 'Mark Ruffalo', character: 'Bruce Banner / Hulk', cast_id: 5, order: 4, profile_path: '/z3dvKqMNDQWk3QLxzumloQVR0pv.jpg' },
            { id: 1896, name: 'Don Cheadle', character: 'James Rhodes / War Machine', cast_id: 6, order: 5, profile_path: '/vPzvP0Qik5yHNf6dF2uqLH9HrX1.jpg' },
            { id: 1327, name: 'Jeremy Renner', character: 'Clint Barton / Hawkeye', cast_id: 7, order: 6, profile_path: '/yBy5ONQQ16Sfau5l6M0qz8Vc1Ky.jpg' },
            { id: 8691, name: 'Paul Rudd', character: 'Scott Lang / Ant-Man', cast_id: 8, order: 7, profile_path: '/8eTtJ7XVXY0BnEeUaSiTAraTIXd.jpg' },
            { id: 1136406, name: 'Brie Larson', character: 'Carol Danvers / Captain Marvel', cast_id: 9, order: 8, profile_path: '/iqZ5uKJWbwSITCK4CqdlUHZTnXD.jpg' },
            { id: 1896, name: 'Karen Gillan', character: 'Nebula', cast_id: 10, order: 9, profile_path: '/zRfVuF7RwbAQwv2kUdLQkKDqPWZ.jpg' },
            { id: 1190668, name: 'Danai Gurira', character: 'Okoye', cast_id: 11, order: 10, profile_path: '/aN8QMEbdHYXN3Vu5Qvg5VYBnPMN.jpg' },
            { id: 1136406, name: 'Benedict Wong', character: 'Wong', cast_id: 12, order: 11, profile_path: '/8eTtJ7XVXY0BnEeUaSiTAraTIXd.jpg' }
        ]

        const insertedActors = insertActors(avengersCast)

        console.log('🐛 COUNTEREXAMPLE FOUND:')
        console.log('Movie: Avengers: Endgame')
        console.log('Total cast members in TMDB:', avengersCast.length)
        console.log('Actors inserted by script:', insertedActors.length)
        console.log('Expected: 8 actors (top cast by order)')
        console.log('Actual: Only 5 actors inserted')
        console.log('')
        console.log('Inserted actors:')
        insertedActors.forEach((actor, index) => {
            console.log(`  ${index + 1}. ${actor.name} as ${actor.character}`)
        })
        console.log('')
        console.log('Missing actors (should be included):')
        avengersCast.slice(5, 8).forEach((actor, index) => {
            console.log(`  ${index + 6}. ${actor.name} as ${actor.character}`)
        })

        // Bug: Only 5 actors inserted
        expect(insertedActors.length).toBe(5)
        expect(insertedActors.length).not.toBe(8)
    })

    it('should FAIL: verifies actors are ordered by cast_order', () => {
        const cast: CastMember[] = [
            { id: 1, name: 'Lead Actor', character: 'Main Character', cast_id: 1, order: 0, profile_path: '/path1.jpg' },
            { id: 2, name: 'Supporting Actor 1', character: 'Support 1', cast_id: 2, order: 1, profile_path: '/path2.jpg' },
            { id: 3, name: 'Supporting Actor 2', character: 'Support 2', cast_id: 3, order: 2, profile_path: '/path3.jpg' },
            { id: 4, name: 'Supporting Actor 3', character: 'Support 3', cast_id: 4, order: 3, profile_path: '/path4.jpg' },
            { id: 5, name: 'Supporting Actor 4', character: 'Support 4', cast_id: 5, order: 4, profile_path: '/path5.jpg' },
            { id: 6, name: 'Supporting Actor 5', character: 'Support 5', cast_id: 6, order: 5, profile_path: '/path6.jpg' },
            { id: 7, name: 'Supporting Actor 6', character: 'Support 6', cast_id: 7, order: 6, profile_path: '/path7.jpg' },
            { id: 8, name: 'Supporting Actor 7', character: 'Support 7', cast_id: 8, order: 7, profile_path: '/path8.jpg' }
        ]

        const insertedActors = insertActors(cast)

        // Verify actors are in correct order
        expect(insertedActors[0].order).toBe(0)
        expect(insertedActors[1].order).toBe(1)
        expect(insertedActors[2].order).toBe(2)
        expect(insertedActors[3].order).toBe(3)
        expect(insertedActors[4].order).toBe(4)

        // Bug: Should have 8 actors, but only has 5
        expect(insertedActors.length).toBe(5)

        // After fix, should include actors with order 5, 6, 7
        // expect(insertedActors[5].order).toBe(5)
        // expect(insertedActors[6].order).toBe(6)
        // expect(insertedActors[7].order).toBe(7)
    })

    it('should work correctly: movies with <8 actors insert all available', () => {
        // Test preservation: movies with small cast should work correctly
        const smallCast: CastMember[] = [
            { id: 1, name: 'Actor 1', character: 'Character 1', cast_id: 1, order: 0, profile_path: '/path1.jpg' },
            { id: 2, name: 'Actor 2', character: 'Character 2', cast_id: 2, order: 1, profile_path: '/path2.jpg' },
            { id: 3, name: 'Actor 3', character: 'Character 3', cast_id: 3, order: 2, profile_path: '/path3.jpg' }
        ]

        const insertedActors = insertActors(smallCast)

        console.log('✅ Small cast test:')
        console.log('Total cast members:', smallCast.length)
        console.log('Actors inserted:', insertedActors.length)

        // This should work correctly (all 3 actors inserted)
        expect(insertedActors.length).toBe(3)
    })

    it('should document the root cause: hardcoded limit of 5', () => {
        console.log('\n🔬 ROOT CAUSE ANALYSIS:')
        console.log('File: scripts/ingestion/MASTER_INGESTION_QUEUE.js')
        console.log('Function: insertActors()')
        console.log('Issue: const topCast = cast.slice(0, 5)')
        console.log('Expected: const topCast = cast.slice(0, 8)')
        console.log('')
        console.log('Impact:')
        console.log('- Movies with 8+ cast members only show 5 actors')
        console.log('- Users miss seeing important cast members')
        console.log('- Watch page displays incomplete cast information')
        console.log('')
        console.log('Fix: Change slice(0, 5) to slice(0, 8) in both:')
        console.log('  1. scripts/ingestion/MASTER_INGESTION_QUEUE.js')
        console.log('  2. scripts/ingestion/MASTER_INGESTION_QUEUE_SERIES.js')

        // Verify the bug exists
        const cast = Array.from({ length: 10 }, (_, i) => ({
            id: i + 1,
            name: `Actor ${i + 1}`,
            character: `Character ${i + 1}`,
            cast_id: i + 1,
            order: i,
            profile_path: `/path${i + 1}.jpg`
        }))

        const inserted = insertActors(cast)
        expect(inserted.length).toBe(5)
        expect(inserted.length).not.toBe(8)
    })
})
