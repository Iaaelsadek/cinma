import { getSession } from './auth';
import { fetchJson } from '../utils/network';

const WEBSITE_BASE_URL = 'https://cinma.online';

export type QoeSample = {
  contentId: string;
  startupMs: number;
  rebufferCount: number;
  watchSeconds: number;
  completed: boolean;
};

export const sendQoeSample = async (sample: QoeSample): Promise<boolean> => {
  const session = await getSession();
  try {
    await fetchJson<unknown>(`${WEBSITE_BASE_URL}/api/mobile/qoe-events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: session?.userId || 'anonymous',
        ...sample,
        createdAt: Date.now(),
      }),
    });
    return true;
  } catch {
    return false;
  }
};
