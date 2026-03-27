import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeCategoryRow } from '../services/nativeCatalog';
import { getLiveHomeRows, getLiveCatalogItems } from '../services/liveCatalog';
import { getActiveProfile, rankRowsForProfile } from '../services/personalization';
import { getContinueWatchingItems, getMyListIds, getMyListItems } from '../services/userLibrary';
import { buildRecommendedRow } from '../services/recommendation';
import { trackEvent } from '../services/analytics';

export const useHomeData = () => {
  const [rows, setRows] = useState<NativeCategoryRow[]>([]);
  const [myListIds, setMyListIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;
    setLoading(true);
    setError(null);
    try {
      const [result, allItems] = await Promise.all([
        getLiveHomeRows(forceRefresh),
        getLiveCatalogItems(),
      ]);
      const profile = await getActiveProfile();
      const rankedRows = rankRowsForProfile(result, profile);
      const [continueWatching, myList, ids] = await Promise.all([
        getContinueWatchingItems(allItems),
        getMyListItems(allItems),
        getMyListIds(),
      ]);
      const recommended = await buildRecommendedRow(allItems);

      const finalRows: NativeCategoryRow[] = [
        ...(continueWatching.length > 0
          ? [{ id: 'continue-watching', title: 'متابعة المشاهدة', items: continueWatching }]
          : []),
        ...(recommended ? [recommended] : []),
        ...(myList.length > 0 ? [{ id: 'my-list', title: 'قائمتي', items: myList }] : []),
        ...rankedRows,
      ];

      if (!isMounted.current) return;
      setRows(finalRows);
      setMyListIds(ids);
      await trackEvent('home_loaded', {
        profileName: profile?.name ?? 'guest',
        rowsCount: finalRows.length,
      });
    } catch (e) {
      if (!isMounted.current) return;
      setError('تعذر تحميل المحتوى. تحقق من اتصالك بالإنترنت.');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const refreshMyListIds = useCallback(async () => {
    const ids = await getMyListIds();
    if (isMounted.current) setMyListIds(ids);
  }, []);

  return { rows, myListIds, loading, error, loadData, refreshMyListIds };
};
