import { Hono } from 'hono';
import { handle } from 'hono/vercel';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import hiAnimeRoutes from '../src/routes/routes';
import config from '../src/config/config';
import { AppError } from '../src/utils/errors';
import { fail } from '../src/utils/response';

const app = new Hono();

// CORS Configuration (FIXED TO PREVENT 500 CRASH)
// CORS Configuration (Ultra-Defensive)
// We ignore the config object for this specific check to avoid bundler errors
const rawOrigin = (typeof config !== 'undefined' && config.origin) ? config.origin : '*';

const origins = (typeof rawOrigin === 'string' && rawOrigin.includes(','))
  ? rawOrigin.split(',').map((o: string) => o.trim())
  : rawOrigin === '*'
    ? '*'
    : [rawOrigin || '*']; // Final safety fallback

app.use(
  '*',
  cors({
    origin: origins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposeHeaders: ['Content-Length', 'X-Request-Id'],
    maxAge: 600,
    credentials: true,
  })
);

// Logging
if (!config?.isProduction || config?.enableLogging) {
  app.use('/api/v2/*', logger());
}

// Health Check
app.get('/ping', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: 'vercel',
  });
});

// Routes
app.route('/api/v2', hiAnimeRoutes);

// Error Handling
app.onError((err, c) => {
  if (err instanceof AppError) {
    return fail(c, err.message, err.statusCode, err.details);
  }

  console.error('Vercel Unexpected Error:', err.message);
  return fail(c, 'Internal server error', 500);
});

app.notFound((c) => {
  return fail(c, 'Route not found', 404);
});

export default handle(app);
