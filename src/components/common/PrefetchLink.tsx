import {Link} from 'react-router-dom'
import type { LinkProps } from 'react-router-dom'
import React from 'react'
import { prefetchRoute } from '../../lib/prefetch'

/** Link that prefetches route chunk on hover for instant navigation */
export const PrefetchLink = (props: LinkProps) => {
  const handler = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (props.to) prefetchRoute(props.to)
    props.onMouseEnter?.(e)
  }
  return <Link {...props} target={props.target || '_self'} onMouseEnter={handler} /> as React.JSX.Element
}
