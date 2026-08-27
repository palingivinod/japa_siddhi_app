import {Router} from 'express';

const SCREENS = [
  {order: 1, name: 'Splash', api: ['GET /api/v1/health']},
  {order: 2, name: 'Language Selection', api: ['GET /api/v1/master/languages', 'GET /api/v1/profile/settings', 'PUT /api/v1/profile/settings']},
  {order: 3, name: 'Login', api: ['POST /api/v1/auth/otp/send']},
  {order: 4, name: 'OTP Verification', api: ['POST /api/v1/auth/otp/verify']},
  {order: 5, name: 'Continue with Google', api: ['POST /api/v1/auth/social']},
  {order: 6, name: 'Continue with Facebook', api: ['POST /api/v1/auth/social']},
  {order: 7, name: 'Continue with Email', api: ['POST /api/v1/auth/otp/send']},
  {order: 8, name: 'Signup Personal Details', api: ['POST /api/v1/auth/register', 'GET /api/v1/master/countries']},
  {order: 9, name: 'Signup Spiritual Details', api: ['POST /api/v1/auth/complete-profile']},
  {order: 10, name: 'Profile Photo', api: ['POST /api/v1/auth/complete-profile']},
  {order: 11, name: 'Registration Confirmation', api: ['GET /api/v1/auth/profile']},
  {order: 12, name: 'Home Dashboard', api: ['GET /api/v1/home', 'GET /api/v1/japa/summary']},
  {order: 13, name: 'Notifications', api: ['GET /api/v1/notifications']},
  {order: 14, name: 'Profile', api: ['GET /api/v1/profile', 'GET /api/v1/auth/profile']},
  {order: 15, name: 'Settings', api: ['GET /api/v1/profile/settings', 'PUT /api/v1/profile/settings']},
  {order: 16, name: 'Language Settings', api: ['GET /api/v1/master/languages', 'PUT /api/v1/profile/settings']},
  {order: 17, name: 'Japa Category Selection', api: ['GET /api/v1/japa/summary']},
  {order: 18, name: 'Community Japa', api: ['GET /api/v1/japa/community', 'POST /api/v1/japa/community/join']},
  {order: 19, name: 'Mantra Selection', api: ['GET /api/v1/mantras']},
  {order: 20, name: 'Goal Selection', api: ['POST /api/v1/japa-goals']},
  {order: 21, name: 'Reference Chant Recording', api: ['POST /api/v1/japa/reference', 'GET /api/v1/japa/reference']},
  {order: 22, name: 'Smart Japa Counting', api: ['POST /api/v1/japa/session', 'POST /api/v1/japa/validate/tap']},
  {order: 23, name: 'Japa Pause AutoLock', api: ['GET /api/v1/profile/settings', 'POST /api/v1/japa/session']},
  {order: 24, name: 'Japa Progress', api: ['GET /api/v1/japa/progress']},
  {order: 25, name: 'My Japa Private', api: ['GET /api/v1/personal-mantras', 'POST /api/v1/japa-goals']},
  {order: 26, name: 'Challenge Japa', api: ['GET /api/v1/challenges']},
  {order: 27, name: 'Challenge Details', api: ['GET /api/v1/challenges/:id', 'POST /api/v1/challenges/:id/join']},
];

const router = Router();

router.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'User screens 1-27',
    data: SCREENS,
  });
});

export default router;
