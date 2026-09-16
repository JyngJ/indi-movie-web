/** 상영작 메뉴가 소유하는 경로. 대표 영화 상세와 기존 상세 경로를 함께 포함한다. */
export function isFilmsPath(pathname: string): boolean {
  return pathname === '/' || pathname === '/films' || pathname.startsWith('/films/') || pathname.startsWith('/movie/')
}
