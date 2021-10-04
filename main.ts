require('dotenv').config();
import fs from 'fs';
import path from 'path';
import { Store } from '@sotaoi/api/store';
import { logger } from '@sotaoi/api/logger';
import { getAppInfo } from '@sotaoi/omni/get-app-info';
import { connect, mconnect, sconnect } from '@sotaoi/api/db';
import { oauthAuthorize, verifyToken } from '@sotaoi/api/auth/oauth-authorize';
import { scopedRequests } from '@sotaoi/api/auth/oauth-authorize';
import { config } from '@sotaoi/api/config';
import { oauthProvider } from '@sotaoi/api/auth/oauth-provider';
import { setVerifyToken } from '@sotaoi/api/routes/oauth-scoped-route';

const { startAuthServer } = require('@sotaoi/auth/auth/app');

let serverInitInterval: any = null;
let serverInitTries = 0;

const main = async (): Promise<void> => {
  try {
    clearTimeout(serverInitInterval);

    const keyPath = path.resolve(process.env.SSL_KEY || '');
    const certPath = path.resolve(process.env.SSL_CERT || '');
    const chainPath = path.resolve(process.env.SSL_CA || '');
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

    const appInfo = getAppInfo(require('dotenv'));
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
