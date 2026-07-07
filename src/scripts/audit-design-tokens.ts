import fs from 'fs'
import path from 'path'

const DIRS_TO_SCAN = ['src/components', 'src/app']

const regexPatterns = {
  fontSize: /fontSize:\s*([0-9]+(?:\.[0-9]+)?)/g,
  borderRadius: /borderRadius:\s*([0-9]+(?:\.[0-9]+)?)/g,
  padding: /padding:\s*['"]([^'"]+)['"]/g,
  gap: /gap:\s*([0-9]+(?:\.[0-9]+)?)/g,
}

let totalFiles = 0
const results: Record<string, Record<string, number>> = {
  fontSize: {},
  borderRadius: {},
  padding: {},
  gap: {},
}

function scanDir(dir: string) {
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    const stat = fs.statSync(fullPath)
    if (stat.isDirectory()) {
      scanDir(fullPath)
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      totalFiles++
      const content = fs.readFileSync(fullPath, 'utf8')
      for (const [key, regex] of Object.entries(regexPatterns)) {
        let match
        while ((match = regex.exec(content)) !== null) {
          const val = match[1]
          if (!results[key][val]) results[key][val] = 0
          results[key][val]++
        }
      }
    }
  }
}

for (const dir of DIRS_TO_SCAN) {
  scanDir(dir)
}

console.log(`Scanned ${totalFiles} files.\n`)

for (const [category, values] of Object.entries(results)) {
  console.log(`=== ${category} ===`)
  const sorted = Object.entries(values).sort((a, b) => b[1] - a[1])
  for (const [val, count] of sorted) {
    console.log(`${val}: ${count} occurrences`)
  }
  console.log('')
}
