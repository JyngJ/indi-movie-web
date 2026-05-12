import vision from '@google-cloud/vision'

const client = new vision.ImageAnnotatorClient()

/**
 * Google Vision OCR로 이미지에서 텍스트 추출
 * GOOGLE_APPLICATION_CREDENTIALS 환경변수 또는 keyFilename 필요
 */
export async function extractTextWithOCR(imagePath: string): Promise<string> {
  const [result] = await client.documentTextDetection(imagePath)
  const fullText = result.fullTextAnnotation?.text ?? ''
  return fullText
}
