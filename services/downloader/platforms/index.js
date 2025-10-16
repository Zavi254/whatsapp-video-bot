import { handleTiktok } from './tiktok.js';
import { handleTwitter } from './twitter.js';
import { handleSnapSaver } from './snapsaver.js';

export const platformHandlers = {
    Tiktok: handleTiktok,
    Twitter: handleTwitter,
    Facebook: handleSnapSaver,
    Instagram: handleSnapSaver,
    Video: handleSnapSaver
};