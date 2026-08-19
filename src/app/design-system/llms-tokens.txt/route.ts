import { llmsTokens } from '@/design-system/llms'

export const dynamic = 'force-static'

export function GET() {
  return new Response(llmsTokens(), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
