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
const app = express();

app.set('trust proxy', 1);

app.use(cors());

app.use(helmet());

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
app.get(['/annasantharpana', '/annadanam'], (_req, res) => {
  res.status(200).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>General Anna Santharpana - Japa Siddhi</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 24px 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #FFFDF9; color: #3A2010;
      display: flex; justify-content: center; align-items: center; min-height: 90vh;
    }
    .card {
      background: #FFFFFF; border-radius: 20px; padding: 32px 24px;
      max-width: 440px; width: 100%; text-align: center;
      border: 1.5px solid #F3E6D0; box-shadow: 0 10px 30px rgba(86,53,15,0.09);
    }
    .icon { font-size: 52px; margin-bottom: 14px; }
    h1 { font-size: 22px; color: #2D5016; margin: 0 0 10px; font-weight: 800; }
    p { font-size: 14px; color: #665242; line-height: 1.6; margin: 0 0 24px; }
    .btn-app {
      display: block; background: #DDA15E; color: #2C1810; font-weight: 800;
      padding: 15px 20px; border-radius: 12px; text-decoration: none; font-size: 16px;
      box-shadow: 0 4px 14px rgba(221,161,94,0.35); margin-bottom: 12px;
    }
    .btn-play {
      display: block; background: #2D5016; color: #FFFFFF; font-weight: 700;
      padding: 13px 20px; border-radius: 12px; text-decoration: none; font-size: 14px;
    }
  </style>
  <script>
    // Automatically trigger app launch if app is installed
    setTimeout(function() {
      window.location.href = "japasiddhi://annasantharpana";
    }, 200);
  </script>
</head>
<body>
  <div class="card">
    <div class="icon">🍲</div>
    <h1>General Anna Santharpana</h1>
    <p>Offer Anna Santharpana for your special occasions and receive divine blessings through Japa Siddhi.</p>
    <a href="japasiddhi://annasantharpana" class="btn-app">🪔 Open in Japa Siddhi App</a>
    <a href="https://play.google.com/store/apps/details?id=com.japasiddhi" class="btn-play">📲 Download on Google Play Store</a>
  </div>
</body>
</html>
  `.trim());
});

app.get('/.well-known/assetlinks.json', (_req, res) => {
  res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'com.japasiddhi.app',
        sha256_cert_fingerprints: [],
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