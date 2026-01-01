import app from '../../server/index.js';
import serverless from 'serverless-http';

export const handler = serverless(app);
