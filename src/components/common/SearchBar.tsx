import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useDebounce } from '../../hooks/useDebounce'
import { Input, InputSize } from './Input'

type SearchBarProps = {
  placeholder?: string
  className?: string
  size?: InputSize
  onQueryChange?: (value: string) => void
}

export const SearchBar = ({ placeholder, className, size = 'md', onQueryChange }: SearchBarProps) => {
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const debounced = useDebounce(q, 400)

  useEffect(() => {
    if (debounced.trim().length > 1) {
      onQueryChange?.(debounced.trim())
      const url = `/search?q=${encodeURIComponent(debounced.trim())}`
      if (location.pathname !== '/search') navigate(url, { replace: false })
    }
  }, [debounced, navigate, location.pathname, onQueryChange])

  return (
    <Input
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder={placeholder || 'ابحث عن فيلم...'}
      size={size}
      className={className}
    />
  )
}
