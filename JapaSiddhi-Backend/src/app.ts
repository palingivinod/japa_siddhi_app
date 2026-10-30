import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import {uploadsRoot} from './middleware/upload.middleware';
import authRoutes from './modules/auth/auth.routes';
import homeRoutes from './modules/home/home.routes';
import japaRoutes from './modules/japa/japa.routes';
import japaGoalRoutes from './modules/japaGoal/japaGoal.routes';
import personalMantraRoutes from './modules/personalMantra/personalMantra.routes';
import festivalRoutes from './modules/festival/festival.routes';
import notificationRoutes from './modules/notification/notification.routes';
import donationRoutes from './modules/donation/donation.routes';
import familyRoutes from './modules/family/family.routes';
import profileRoutes from './modules/profile/profile.routes';
import masterRoutes from './modules/master/master.routes';
import orderRoutes from './modules/orders/order.routes';
import banaLingamRoutes from './modules/banaLingam/banaLingam.routes';
import customerCareRoutes from './modules/customerCare/customerCare.routes';
import feedbackRoutes from './modules/feedback/feedback.routes';
import challengeRoutes from './modules/challenge/challenge.routes';
import reportRoutes from './modules/report/report.routes';
import adminRoutes from './modules/admin/admin.routes';
import bannerRoutes from './modules/banner/banner.routes';
import annadanamRoutes from './modules/annadanam/annadanam.routes';
import mantraRoutes from './modules/mantra/mantra.routes';
import screensRoutes from './modules/screens/screens.routes';
import publicWebsiteRoutes from './modules/public/publicWebsite.routes';
import razorpayRoutes from './modules/payments/razorpay.routes';
import database from './database/mysql';
import {getSqlitePath} from './database/sqliteEngine';
import {
  pickLandingLang,
  renderDeepLinkLanding,
  resolveBookingLanding,
  resolveMonthlySupportLanding,
} from './utils/deepLinkLanding';
const app = express();

app.set('trust proxy', 1);

app.use(cors());

app.use(
  helmet({
    // Uploaded screenshots / feedback media are opened from the admin app and
    // external browsers; same-origin CORP blocks those loads.
    crossOriginResourcePolicy: {policy: 'cross-origin'},
    crossOriginOpenerPolicy: {policy: 'same-origin-allow-popups'},
  }),
);

app.use(compression());

// Razorpay signs the raw body. This must run before JSON parsing.
app.use(
  '/api/v1/payments/razorpay/webhook',
  express.raw({type: 'application/json'}),
);

app.use((req, res, next) => {
  if (req.path === '/api/v1/payments/razorpay/webhook') {
    next();
    return;
  }
  express.json({limit: '20mb'})(req, res, next);
});


app.use(
  express.urlencoded({
    extended: true,
    limit: '20mb',
  }),
);


app.use(morgan('dev'));

// Intro MP4s ship with the server. Render has no persistent disk, and more
// than one instance cannot share an uploaded folder.
const bundledVideos = path.resolve(process.cwd(), 'public', 'videos');
app.use(
  '/uploads/videos',
  express.static(bundledVideos, {
    setHeaders: res => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  }),
);

app.use(
  '/uploads',
  express.static(uploadsRoot, {
    setHeaders: res => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  }),
);



app.get('/', async (_, res) => {
  await database.query('SELECT 1');
  res.status(200).json({
    success: true,
    application: 'Japa Siddhi Backend',
    version: '1.0.0',
    status: 'Running',
    database: database.getEngineName(),
  });
});

// Direct Web Landing & Deep Link Redirect for Anna Santharpana
app.get(['/annasantharpana', '/annadanam'], (req, res) => {
  const lang = pickLandingLang({
    queryLang: String(req.query.lang || req.query.hl || ''),
    acceptLanguage: String(req.headers['accept-language'] || ''),
  });
  const page = resolveBookingLanding('annasantharpana', lang);
  res.status(200).send(
    renderDeepLinkLanding({
      title: page.title,
      subtitle: page.subtitle,
      appDeepLink: page.deepLink,
      icon: page.icon || '🍲',
      lang,
    }),
  );
});

// Monthly Support flyer links (same open-app pattern as Anna Santharpana)
app.get(['/ms', '/ms/:slug'], (req, res) => {
  const lang = pickLandingLang({
    queryLang: String(req.query.lang || req.query.hl || ''),
    acceptLanguage: String(req.headers['accept-language'] || ''),
  });
  const page = resolveMonthlySupportLanding(String(req.params.slug || ''), lang);
  res.status(200).send(
    renderDeepLinkLanding({
      title: page.title,
      subtitle: page.subtitle,
      appDeepLink: page.deepLink,
      icon: '🙏',
      lang,
    }),
  );
});

// Booking / seva flyer links
app.get(['/book', '/book/:slug', '/booking', '/booking/:slug'], (req, res) => {
  const lang = pickLandingLang({
    queryLang: String(req.query.lang || req.query.hl || ''),
    acceptLanguage: String(req.headers['accept-language'] || ''),
  });
  const page = resolveBookingLanding(String(req.params.slug || ''), lang);
  res.status(200).send(
    renderDeepLinkLanding({
      title: page.title,
      subtitle: page.subtitle,
      appDeepLink: page.deepLink,
      icon: page.icon || '🪔',
      lang,
    }),
  );
});

app.get('/.well-known/assetlinks.json', (_req, res) => {
  // Must match applicationId + signing certs (upload/release + debug).
  // If Play App Signing is on, also add the Play Console "App signing key" SHA-256.
  res.setHeader('Content-Type', 'application/json');
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.japasiddhi',
        sha256_cert_fingerprints: [
          // Firebase / Play Console SHA-256 fingerprints
          '7C:D4:F7:DE:45:34:8F:1C:1A:A0:7F:A7:FE:48:96:20:91:FC:E7:6B:0F:C3:0C:DE:A1:CA:BC:17:B3:02:2B:15',
          '4D:43:09:24:08:7A:B1:56:6D:AE:C0:61:7E:75:21:0F:70:DD:0E:A4:1C:EB:FD:D8:94:F9:BD:12:F4:47:16:BE',
          // Release / upload keystore
          '81:02:F4:49:E2:F5:54:B0:1B:46:9A:20:56:D0:B6:58:D3:48:B6:22:FA:BA:C3:F1:83:7C:CD:DE:F4:BE:30:BE',
          // Debug keystore
          'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C',
        ],
      },
    },
  ]);
});

app.get('/api/v1/health', async (_, res) => {
  await database.query('SELECT 1');
  let usersActive = 0;
  let usersDeleted = 0;
  let donations = 0;
  let japaSessions = 0;
  try {
    const active = await database.query<any[]>(
      `SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL`,
    );
    const deleted = await database.query<any[]>(
      `SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NOT NULL`,
    );
    const don = await database.query<any[]>(
      `SELECT COUNT(*) AS total FROM donations`,
    );
    const japa = await database.query<any[]>(
      `SELECT COUNT(*) AS total FROM japa_sessions`,
    );
    usersActive = Number(active?.[0]?.total || 0);
    usersDeleted = Number(deleted?.[0]?.total || 0);
    donations = Number(don?.[0]?.total || 0);
    japaSessions = Number(japa?.[0]?.total || 0);
  } catch {
    // Counts are diagnostic only.
  }
  res.status(200).json({
    success: true,
    message: 'API and database are healthy',
    data: {
      database: database.getEngineName(),
      sqlitePath:
        database.getEngineName() === 'sqlite'
          ? getSqlitePath()
          : process.env.SQLITE_PATH || null,
      usersActive,
      usersDeleted,
      donations,
      japaSessions,
    },
  });
});



app.use(
  '/api/v1/auth',
  authRoutes,
);
app.use(
  '/api/v1/home',
  homeRoutes,
);
app.use(
  '/api/v1/mantras',
  mantraRoutes,
);
app.use(
  '/api/v1/japa',
  japaRoutes,
);
app.use(
  '/api/v1/japa-goals',
  japaGoalRoutes,
);
app.use(
  '/api/v1/personal-mantras',
  personalMantraRoutes,
);
app.use(
  '/api/v1/festivals',
  festivalRoutes,
);
app.use(
  '/api/v1/notifications',
  notificationRoutes,
);
app.use(
  '/api/v1/donations',
  donationRoutes,
);
app.use(
  '/api/v1/family',
  familyRoutes,
);
app.use(
  '/api/v1/profile',
  profileRoutes,
);
app.use(
  '/api/v1/master',
  masterRoutes,
);
app.use(
  '/api/v1/orders',
  orderRoutes,
);
app.use(
  '/api/v1/bana-lingam',
  banaLingamRoutes,
);
app.use(
  '/api/v1/customer-care',
  customerCareRoutes,
);
app.use(
  '/api/v1/feedback',
  feedbackRoutes,
);
app.use(
  '/api/v1/challenges',
  challengeRoutes,
);
app.use(
  '/api/v1/reports',
  reportRoutes,
);
app.use(
  '/api/v1/admin',
  adminRoutes,
);
app.use(
  '/api/v1/banners',
  bannerRoutes,
);
app.use(
  '/api/v1/annadanam',
  annadanamRoutes,
);
app.use(
  '/api/v1/screens',
  screensRoutes,
);
// Read-only marketing site data (challenges, rewards, counts). No auth.
app.use(
  '/api/v1/public',
  publicWebsiteRoutes,
);
app.use(
  '/api/v1/payments/razorpay',
  razorpayRoutes,
);

app.use((error: any, _req: any, res: any, _next: any) => {
  const status = error?.statusCode || error?.status || 500;
  res.status(status).json({
    success: false,
    message: error?.message || 'Internal server error',
  });
});

export default app;