'use client'

import { InputHTMLAttributes, forwardRef } from 'react'

const IconSearch = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
)

const IconClose = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

/* ── 버튼 모드 — 검색 페이지로 이동하는 트리거 ── */
interface SearchBarButtonProps {
  placeholder?: string
  onClick?: () => void
  className?: string
}

export function SearchBarButton({
  placeholder = '영화, 영화관, 감독을 검색하세요',
  onClick,
  className = '',
}: SearchBarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-[10px] border w-full text-left ${className}`}
      style={{
        height: 'var(--comp-search-height)',
        paddingLeft: 'var(--comp-search-px)',
        paddingRight: 'var(--comp-search-px)',
        borderRadius: 'var(--comp-search-radius)',
        backgroundColor: 'var(--color-surface-card)',
        borderColor: 'var(--color-border)',
        cursor: 'pointer',
        minHeight: 'unset',  // globals.css button min-height 44px 재정의
      }}
    >
      <span className="flex-shrink-0" style={{ color: 'var(--color-text-body)' }}>
        <IconSearch />
      </span>
      <span className="flex-1 text-[14px]" style={{ color: 'var(--color-text-placeholder)' }}>
        {placeholder}
      </span>
    </button>
  )
}

/* ── 인풋 모드 — 검색 페이지 내 실제 입력 필드 ── */
interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void
  onBack?: () => void
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { placeholder = '영화, 영화관, 감독을 검색하세요', value, onClear, onBack, onChange, className = '', ...props },
  ref
) {
  const isControlled = value !== undefined
  const hasValue = isControlled && value !== ''

  const inputValueProps = isControlled
    ? { value: value as string, onChange }
    : {}

  return (
    <div
      className={`flex flex-1 items-center gap-[10px] border transition-colors duration-150 ${className}`}
      style={{
        height: 'var(--comp-search-height)',
        paddingLeft: onBack ? 4 : 'var(--comp-search-px)',
        paddingRight: 'var(--comp-search-px)',
        borderRadius: 'var(--comp-search-radius)',
        backgroundColor: 'var(--color-surface-card)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* 뒤로가기 or 돋보기 */}
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          className="flex-shrink-0 flex items-center justify-center"
          style={{
            width: 36, height: 36, padding: 0,
            border: 'none', background: 'none',
            color: 'var(--color-text-body)',
            cursor: 'pointer',
            minHeight: 'unset',
          }}
          aria-label="뒤로가기"
        >
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      ) : (
        <span
          className="flex-shrink-0"
          style={{ color: 'var(--color-text-body)' }}
        >
          <IconSearch />
        </span>
      )}

      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none border-none"
        style={{ color: 'var(--color-text-primary)', fontSize: 16 }}  // 16px 미만이면 iOS 자동 줌인
        {...inputValueProps}
        {...props}
      />

      {hasValue && (
        <button
          type="button"
          onClick={onClear}
          className="flex-shrink-0 flex items-center justify-center"
          style={{ color: 'var(--color-text-body)', minHeight: 'unset' }}
          aria-label="검색어 지우기"
        >
          <IconClose />
        </button>
      )}
    </div>
  )
})
