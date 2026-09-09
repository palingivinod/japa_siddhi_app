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
import database from './database/mysql';
const app = express();

app.set('trust proxy', 1);

app.use(cors());

app.use(helmet());

app.use(compression());


app.use(
  express.json({
    limit: '20mb',
  }),
);


app.use(
  express.urlencoded({
    extended: true,
    limit: '20mb',
  }),
);


app.use(morgan('dev'));

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

app.get('/api/v1/health', async (_, res) => {
  await database.query('SELECT 1');
  res.status(200).json({
    success: true,
    message: 'API and database are healthy',
    data: {
      database: database.getEngineName(),
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

app.use((error: any, _req: any, res: any, _next: any) => {
  const status = error?.statusCode || error?.status || 500;
  res.status(status).json({
    success: false,
    message: error?.message || 'Internal server error',
  });
});

export default app;