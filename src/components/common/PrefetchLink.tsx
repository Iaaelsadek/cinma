import { Link, type LinkProps } from 'react-router-dom'
import { useCallback } from 'react'
import { prefetchRoute } from '../../lib/prefetch'

/** Link that prefetches route chunk on hover for instant navigation */
export const PrefetchLink = (props: LinkProps) => {
  const handler = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (props.to) prefetchRoute(props.to)
      props.onMouseEnter?.(e)
    },
    [props.to, props.onMouseEnter]
  )
  return <Link {...props} onMouseEnter={handler} /> as JSX.Element
}
