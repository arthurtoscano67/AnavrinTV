import pino from 'pino';

import { env } from './env.js';
import { sleep } from './utils.js';

const logger = pino({ name: 'onreel-payout-service' });

async function main(): Promise<void> {
  logger.info({ pollMs: env.WORKFLOW_POLL_INTERVAL_MS }, 'service started');
  while (true) {
    await sleep(env.WORKFLOW_POLL_INTERVAL_MS);
  }
}

main().catch((error) => {
  logger.fatal({ error }, 'service crashed');
  process.exit(1);
});
