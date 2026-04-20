import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { PageLoader } from '../common/PageLoader';

const SeriesDetails = lazy(() =>
  import('../../pages/media/SeriesDetails').then((m) => ({ default: m.default }))
);
const CategoryHub = lazy(() =>
  import('../../pages/CategoryHub').then((m) => ({ default: m.CategoryHub }))
);

export const SeriesRouteHandler = () => {
  const params = useParams();
  const { slug } = params;

  // Check if it's a known category first
  const knownCategories = ['top_rated', 'popular', 'on_the_air', 'airing_today', 'trending'];
  const isKnownCategory = knownCategories.includes(slug || '');

  // If it's a known category, show CategoryHub
  if (isKnownCategory) {
    return (
      <Suspense fallback={<PageLoader />}>
        <CategoryHub type='tv' category={slug} />
      </Suspense>
    );
  }

  // Otherwise, treat it as a series slug and show SeriesDetails
  return (
    <Suspense fallback={<PageLoader />}>
      <SeriesDetails slug={slug} />
    </Suspense>
  );
};
