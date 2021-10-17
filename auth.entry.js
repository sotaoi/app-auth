const { init } = require('@app/omni/init');
init();
const { main } = require('@app/auth/main');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

main();
