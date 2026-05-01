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

interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void
}

export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { placeholder = '영화, 영화관, 감독을 검색하세요', value, onClear, onChange, className = '', ...props },
  ref
) {
  const isControlled = value !== undefined
  const hasValue = isControlled && value !== ''

  /* controlled(value 제공) vs uncontrolled(defaultValue 등) 분리
     → value 없이 onChange만 넘기면 React 경고 발생하므로 함께 처리 */
  const inputValueProps = isControlled
    ? { value: value as string, onChange }
    : {}

  return (
    <div
      className={`flex items-center gap-[10px] border transition-colors duration-150 ${className}`}
      style={{
        height: 'var(--comp-search-height)',
        paddingLeft: 'var(--comp-search-px)',
        paddingRight: 'var(--comp-search-px)',
        borderRadius: 'var(--comp-search-radius)',
        backgroundColor: 'var(--color-surface-raised)',
        borderColor: 'var(--color-border)',
      }}
    >
      <span
        className="flex-shrink-0"
        style={{ color: hasValue ? 'var(--color-text-body)' : 'var(--color-text-caption)' }}
      >
        <IconSearch />
      </span>

      <input
        ref={ref}
        type="search"
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none border-none text-[14px]"
        style={{ color: 'var(--color-text-primary)' }}
        {...inputValueProps}
        {...props}
      />

      {hasValue && (
        <button
          type="button"
          onClick={onClear}
          className="flex-shrink-0 flex items-center justify-center"
          style={{ color: 'var(--color-text-caption)' }}
          aria-label="검색어 지우기"
        >
          <IconClose />
        </button>
      )}
    </div>
  )
})
