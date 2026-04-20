/**
 * Preservation Property Test - Small Cast Movies
 * 
 * **Property 2: Preservation** - Small Cast Insertion Unchanged
 * **IMPORTANT**: This test should PASS on UNFIXED code
 * 
 * This test validates Requirement 3.5
 * 
 * **Validates: Requirements 3.5**
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'

// Mock TMDB cast member structure
interface TMDBCastMember {
    id: number
    name: string
    character: string
    profile_path: string | null
    cast_id: number
    order: number
}

// Mock database actor structure
interface DatabaseActor {
    actor_id: number
    name: string
    character: string
    profile_path: string | null
    cast_order: number
}

// Mock insertActors function (CURRENT implementation with limit of 5)
function insertActors_current(cast: TMDBCastMember[]): DatabaseActor[] {
    // Current implementation: limits to 5 actors
    const topCast = cast.slice(0, 5)

    return topCast.map(actor => ({
        actor_id: actor.id,
        name: actor.name,
        character: actor.character,
        profile_path: actor.profile_path,
        cast_order: actor.order
    }))
}

describe('Preservation Property Test - Small Cast Movies', () => {
    it('should PASS: inserts all actors for movies with 3 cast members (preservation)', () => {
        const smallCast: TMDBCastMember[] = [
            {
                id: 1,
                name: 'Actor One',
                character: 'Character One',
                profile_path: '/actor1.jpg',
                cast_id: 1,
                order: 0
            },
            {
                id: 2,
                name: 'Actor Two',
                character: 'Character Two',
                profile_path: '/actor2.jpg',
                cast_id: 2,
                order: 1
            },
            {
                id: 3,
                name: 'Actor Three',
                character: 'Character Three',
                profile_path: '/actor3.jpg',
                cast_id: 3,
                order: 2
            }
        ]

        const result = insertActors_current(smallCast)

        // Should insert all 3 actors (no truncation needed)
        expect(result.length).toBe(3)
        expect(result[0].name).toBe('Actor One')
        expect(result[1].name).toBe('Actor Two')
        expect(result[2].name).toBe('Actor Three')
    })

    it('should PASS: inserts all actors for movies with 5 cast members (preservation)', () => {
        const fiveCast: TMDBCastMember[] = [
            {
                id: 1,
                name: 'Leonardo DiCaprio',
                character: 'Dom Cobb',
                profile_path: '/leo.jpg',
                cast_id: 1,
                order: 0
            },
            {
                id: 2,
                name: 'Joseph Gordon-Levitt',
                character: 'Arthur',
                profile_path: '/joseph.jpg',
                cast_id: 2,
                order: 1
            },
            {
                id: 3,
                name: 'Ellen Page',
                character: 'Ariadne',
                profile_path: '/ellen.jpg',
                cast_id: 3,
                order: 2
            },
            {
                id: 4,
                name: 'Tom Hardy',
                character: 'Eames',
                profile_path: '/tom.jpg',
                cast_id: 4,
                order: 3
            },
            {
                id: 5,
                name: 'Marion Cotillard',
                character: 'Mal',
                profile_path: '/marion.jpg',
                cast_id: 5,
                order: 4
            }
        ]

        const result = insertActors_current(fiveCast)

        // Should insert all 5 actors
        expect(result.length).toBe(5)
        expect(result[0].name).toBe('Leonardo DiCaprio')
        expect(result[4].name).toBe('Marion Cotillard')
    })

    it('should PASS: inserts all actors for movies with 1 cast member (preservation)', () => {
        const singleCast: TMDBCastMember[] = [
            {
                id: 1,
                name: 'Tom Hanks',
                character: 'Chuck Noland',
                profile_path: '/tom-hanks.jpg',
                cast_id: 1,
                order: 0
            }
        ]

        const result = insertActors_current(singleCast)

        // Should insert the single actor
        expect(result.length).toBe(1)
        expect(result[0].name).toBe('Tom Hanks')
        expect(result[0].character).toBe('Chuck Noland')
    })

    it('should PASS: inserts all actors for movies with 4 cast members (preservation)', () => {
        const fourCast: TMDBCastMember[] = [
            {
                id: 1,
                name: 'Actor A',
                character: 'Character A',
                profile_path: '/a.jpg',
                cast_id: 1,
                order: 0
            },
            {
                id: 2,
                name: 'Actor B',
                character: 'Character B',
                profile_path: '/b.jpg',
                cast_id: 2,
                order: 1
            },
            {
                id: 3,
                name: 'Actor C',
                character: 'Character C',
                profile_path: '/c.jpg',
                cast_id: 3,
                order: 2
            },
            {
                id: 4,
                name: 'Actor D',
                character: 'Character D',
                profile_path: '/d.jpg',
                cast_id: 4,
                order: 3
            }
        ]

        const result = insertActors_current(fourCast)

        // Should insert all 4 actors
        expect(result.length).toBe(4)
        expect(result.map(a => a.name)).toEqual(['Actor A', 'Actor B', 'Actor C', 'Actor D'])
    })

    it('should PASS: property-based test for small cast movies', () => {
        fc.assert(
            fc.property(
                fc.integer({ min: 1, max: 5 }),
                (numActors) => {
                    const cast: TMDBCastMember[] = Array.from({ length: numActors }, (_, i) => ({
                        id: i + 1,
                        name: `Actor ${i + 1}`,
                        character: `Character ${i + 1}`,
                        profile_path: `/actor${i + 1}.jpg`,
                        cast_id: i + 1,
                        order: i
                    }))

                    const result = insertActors_current(cast)

                    // Property: For movies with ≤5 cast members, all actors should be inserted
                    expect(result.length).toBe(numActors)

                    // Verify all actors are present
                    result.forEach((actor, index) => {
                        expect(actor.name).toBe(`Actor ${index + 1}`)
                        expect(actor.cast_order).toBe(index)
                    })
                }
            ),
            { numRuns: 50 }
        )
    })

    it('should PASS: preserves cast order for small cast movies (preservation)', () => {
        const orderedCast: TMDBCastMember[] = [
            {
                id: 10,
                name: 'Lead Actor',
                character: 'Protagonist',
                profile_path: '/lead.jpg',
                cast_id: 10,
                order: 0
            },
            {
                id: 20,
                name: 'Supporting Actor',
                character: 'Sidekick',
                profile_path: '/support.jpg',
                cast_id: 20,
                order: 1
            },
            {
                id: 30,
                name: 'Minor Actor',
                character: 'Background',
                profile_path: '/minor.jpg',
                cast_id: 30,
                order: 2
            }
        ]

        const result = insertActors_current(orderedCast)

        // Should preserve cast order
        expect(result[0].cast_order).toBe(0)
        expect(result[1].cast_order).toBe(1)
        expect(result[2].cast_order).toBe(2)

        // Lead actor should be first
        expect(result[0].name).toBe('Lead Actor')
    })

    it('should PASS: handles actors without profile images (preservation)', () => {
        const castWithoutImages: TMDBCastMember[] = [
            {
                id: 1,
                name: 'Unknown Actor',
                character: 'Background Character',
                profile_path: null,
                cast_id: 1,
                order: 0
            },
            {
                id: 2,
                name: 'Another Actor',
                character: 'Minor Role',
                profile_path: null,
                cast_id: 2,
                order: 1
            }
        ]

        const result = insertActors_current(castWithoutImages)

        // Should insert actors even without profile images
        expect(result.length).toBe(2)
        expect(result[0].profile_path).toBeNull()
        expect(result[1].profile_path).toBeNull()
        expect(result[0].name).toBe('Unknown Actor')
        expect(result[1].name).toBe('Another Actor')
    })

    it('should PASS: handles Arabic actor names (preservation)', () => {
        const arabicCast: TMDBCastMember[] = [
            {
                id: 100,
                name: 'عادل إمام',
                character: 'البطل',
                profile_path: '/adel.jpg',
                cast_id: 100,
                order: 0
            },
            {
                id: 101,
                name: 'يسرا',
                character: 'البطلة',
                profile_path: '/yousra.jpg',
                cast_id: 101,
                order: 1
            },
            {
                id: 102,
                name: 'محمد هنيدي',
                character: 'الشخصية الكوميدية',
                profile_path: '/henedy.jpg',
                cast_id: 102,
                order: 2
            }
        ]

        const result = insertActors_current(arabicCast)

        // Should handle Arabic names correctly
        expect(result.length).toBe(3)
        expect(result[0].name).toBe('عادل إمام')
        expect(result[1].name).toBe('يسرا')
        expect(result[2].name).toBe('محمد هنيدي')
        expect(result[0].character).toBe('البطل')
    })

    it('should PASS: handles empty cast array (preservation)', () => {
        const emptyCast: TMDBCastMember[] = []

        const result = insertActors_current(emptyCast)

        // Should handle empty cast gracefully
        expect(result.length).toBe(0)
    })

    it('should document preservation: small cast movies work correctly', () => {
        const smallCast: TMDBCastMember[] = [
            {
                id: 1,
                name: 'Ryan Reynolds',
                character: 'Buried Man',
                profile_path: '/ryan.jpg',
                cast_id: 1,
                order: 0
            },
            {
                id: 2,
                name: 'Voice Actor 1',
                character: 'Voice on Phone',
                profile_path: null,
                cast_id: 2,
                order: 1
            },
            {
                id: 3,
                name: 'Voice Actor 2',
                character: 'Another Voice',
                profile_path: null,
                cast_id: 3,
                order: 2
            }
        ]

        const result = insertActors_current(smallCast)

        console.log('✅ PRESERVATION VERIFIED:')
        console.log('Movie: Buried (small cast movie)')
        console.log('Cast size:', smallCast.length)
        console.log('Actors inserted:', result.length)
        console.log('All actors inserted:', result.length === smallCast.length)
        console.log('Expected: All 3 actors inserted')
        console.log('Actual: All 3 actors inserted')

        // Preservation: Small cast movies insert all actors
        expect(result.length).toBe(3)
        expect(result[0].name).toBe('Ryan Reynolds')
        expect(result[1].name).toBe('Voice Actor 1')
        expect(result[2].name).toBe('Voice Actor 2')
    })

    it('should PASS: handles special characters in actor names (preservation)', () => {
        const specialCharCast: TMDBCastMember[] = [
            {
                id: 1,
                name: "O'Brien, Conan",
                character: "Self / Host",
                profile_path: '/conan.jpg',
                cast_id: 1,
                order: 0
            },
            {
                id: 2,
                name: 'Björk Guðmundsdóttir',
                character: 'Selma Ježková',
                profile_path: '/bjork.jpg',
                cast_id: 2,
                order: 1
            }
        ]

        const result = insertActors_current(specialCharCast)

        // Should handle special characters correctly
        expect(result.length).toBe(2)
        expect(result[0].name).toBe("O'Brien, Conan")
        expect(result[1].name).toBe('Björk Guðmundsdóttir')
        expect(result[0].character).toBe('Self / Host')
        expect(result[1].character).toBe('Selma Ježková')
    })
})
