process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { init } = require('@app/omni/init');
init();
const { config } = require('@app/omni/config');
const fs = require('fs');
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
    clearTimeout(serverInitInterval);

    const { startAuthServer } = require('@sotaoi/auth/auth/app');
    new AppKernel().bootstrap(config);
    const appInfo = getAppInfo();

    const keyPath = require.resolve(appInfo.sslKey);
    const certPath = require.resolve(appInfo.sslCert);
    const chainPath = require.resolve(appInfo.sslCa);
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

    await Store.init(appInfo, {}, {}, scopedRequests());

    // start

    setVerifyToken(verifyToken);
    const oauthPort = config('app.oauth_port');
    startAuthServer(
      {
        SSL_KEY: keyPath,
        SSL_CERT: certPath,
        SSL_CA: chainPath,
      },
      oauthPort,
      oauthProvider(oauthPort),
      oauthAuthorize,
    );
  } catch (err) {
    logger().estack(err);
  }
};

module.exports = { main };
