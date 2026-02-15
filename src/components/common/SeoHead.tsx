import { Helmet } from 'react-helmet-async'

type Props = {
  schema: Record<string, unknown> | Array<Record<string, unknown>>
}

export const SeoHead = ({ schema }: Props) => {
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  )
}
