const { init } = require('@app/omni/init');
init();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { main } = require('@app/auth/main');

main();
