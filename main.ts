import { config } from '@app/omni/config';
config('');
import fs from 'fs';
import path from 'path';
import { Store } from '@sotaoi/api/store';
import { logger } from '@sotaoi/api/logger';
import { getAppInfo } from '@sotaoi/omni/get-app-info';
import { connect, mconnect, sconnect } from '@sotaoi/api/db';
import { oauthAuthorize, verifyToken } from '@sotaoi/api/auth/oauth-authorize';
import { scopedRequests } from '@sotaoi/api/auth/oauth-authorize';
import { oauthProvider } from '@sotaoi/api/auth/oauth-provider';
import { setVerifyToken } from '@sotaoi/api/routes/oauth-scoped-route';
import { AppKernel } from '../packages/sotaoi-api/app-kernel';

const { startAuthServer } = require('@sotaoi/auth/auth/app');

new AppKernel().bootstrap(config);

let serverInitInterval: any = null;
let serverInitTries = 0;

const main = async (): Promise<void> => {
  try {
    clearTimeout(serverInitInterval);

    const keyPath = path.resolve(getAppInfo().sslKey);
    const certPath = path.resolve(getAppInfo().sslCert);
    const chainPath = path.resolve(getAppInfo().sslCa);
    if (!fs.existsSync(keyPath) || !fs.existsSync(certPath) || !fs.existsSync(chainPath)) {
      if (serverInitTries === 60) {
        console.error('server failed to start because at least one ssl certificate file is missing');
        return;
      }
      serverInitTries++;
      console.warn('at least one certificate file is missing. retrying in 5 seconds...');
      serverInitInterval = setTimeout(async (): Promise<void> => {
        await main();
      }, 5000);
      return;
    }

    await connect();
    await mconnect();
    await sconnect();

    const appInfo = getAppInfo();
    await Store.init(appInfo, {}, {}, scopedRequests());

    // start

    setVerifyToken(verifyToken);
    const oauthPort = config('app.oauth_port');
    startAuthServer(oauthPort, oauthProvider(oauthPort), oauthAuthorize);
  } catch (err) {
    logger().estack(err);
  }
};

export { main };
