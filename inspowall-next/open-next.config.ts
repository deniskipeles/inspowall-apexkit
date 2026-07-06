import type { OpenNextConfig } from '@opennextjs/cloudflare';

const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: 'cloudflare-edge',
      converter: 'edge',
    },
  },
};

export default config;