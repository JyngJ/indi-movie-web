import { searchKmdbByDirector } from '../src/lib/admin/kmdb'
import { importAdminExternalMovie } from '../src/lib/admin/store'

async function main() {
  const directors = [
    '스탠리 큐브릭',
    '데이빗 핀처',
    '기예르모 델 토로',
    '알폰소 쿠아론',
    '알레한드로 곤잘레스 이냐리투',
    '에드가 라이트',
    '우디 앨런',
    '리들리 스콧',
    '페드로 알모도바르',
    '왕가위',
    '이안',
    '고레에다 히로카즈'
  ]

  console.log(`Starting to import famous directors' movies...`)

  let successCount = 0
  let skipCount = 0

  for (const director of directors) {
    console.log(`\n============================`)
    console.log(`Searching movies for director: ${director}`)
    try {
      const movies = await searchKmdbByDirector(director)
      console.log(`Found ${movies.length} movies. Importing...`)

      for (const movie of movies) {
        try {
          // importAdminExternalMovie checks if the movie already exists 
          // via upsert or duplicate check inside supabase, or it creates it.
          const imported = await importAdminExternalMovie(movie)
          console.log(`  [OK] ${imported.label}`)
          successCount++
        } catch (e: any) {
          if (e.code === '23505' || e.message?.includes('duplicate key') || e.message?.includes('이미 존재')) {
            console.log(`  [SKIP] ${movie.title} (Already exists)`)
            skipCount++
          } else {
            console.error(`  [ERROR] Failed to import ${movie.title}: ${e.message}`)
          }
        }
      }
    } catch (e: any) {
      console.error(`Failed to fetch movies for ${director}: ${e.message}`)
    }
  }

  console.log(`\n============================`)
  console.log(`Done! Imported ${successCount} movies, skipped ${skipCount} existing.`)
}

main()
