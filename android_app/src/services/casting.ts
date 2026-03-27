import { getCurrentDeviceProfile, listUserDevices, ManagedDevice, sendHandoff } from './deviceHandoff';

export type CastTarget = ManagedDevice;

export const getCastTargets = async (): Promise<CastTarget[]> => {
  const [devices, current] = await Promise.all([listUserDevices(), getCurrentDeviceProfile()]);
  return devices.filter((device) => device.id !== current.id && device.kind === 'tv');
};

export const castMedia = async (params: {
  targetDeviceId: string;
  contentId: string;
  title: string;
  poster: string;
  streamUrl: string;
  positionSec: number;
}) =>
  sendHandoff({
    targetDeviceId: params.targetDeviceId,
    contentId: params.contentId,
    title: params.title,
    poster: params.poster,
    streamUrl: params.streamUrl,
    positionSec: params.positionSec,
  });

export const stopCasting = async () => true;
