const { config } = require('@app/omni/config');
const fs = require('fs');
const path = require('path');
const { Store } = require('@sotaoi/api/store');
const { logger } = require('@sotaoi/api/logger');
const { getAppInfo } = require('@sotaoi/omni/get-app-info');
const { connect, mconnect, sconnect } = require('@sotaoi/api/db');
const { oauthAuthorize, verifyToken } = require('@sotaoi/api/auth/oauth-authorize');
const { scopedRequests } = require('@sotaoi/api/auth/oauth-authorize');
const { oauthProvider } = require('@sotaoi/api/auth/oauth-provider');
const { setVerifyToken } = require('@sotaoi/api/routes/oauth-scoped-route');
const { AppKernel } = require('@sotaoi/api/app-kernel');

let serverInitInterval = null;
let serverInitTries = 0;

const main = async () => {
  try {
    const { startAuthServer } = require('@sotaoi/auth/auth/app');
    new AppKernel().bootstrap(config);

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
      serverInitInterval = setTimeout(async () => {
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

module.exports = { main };
