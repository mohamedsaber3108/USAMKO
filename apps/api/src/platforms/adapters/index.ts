// Platform adapters exports

export { BasePostAdapter } from './base.adapter';

export { FacebookAdapter } from './facebook.adapter';
export type { FacebookPost, FacebookPostOptions } from './facebook.adapter';

export { InstagramAdapter } from './instagram.adapter';
export type { InstagramPost, InstagramPostOptions } from './instagram.adapter';

export { LinkedInAdapter } from './linkedin.adapter';
export type { LinkedInPost, LinkedInPostOptions } from './linkedin.adapter';

export { TwitterAdapter } from './twitter.adapter';
export type { TwitterPost, TwitterPostOptions } from './twitter.adapter';

// Export all adapters as a type
export type PlatformAdapter = any;