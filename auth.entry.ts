import { init } from '@app/omni/init';
init();
import { main } from '@app/auth/main';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

main();
