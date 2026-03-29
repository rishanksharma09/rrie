import * as dotenv from 'dotenv';
dotenv.config();

import * as Sentry from "@sentry/node";
if(process.env.NODE_ENV === 'production') {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        sendDefaultPii: true,
    });
}

export default Sentry;