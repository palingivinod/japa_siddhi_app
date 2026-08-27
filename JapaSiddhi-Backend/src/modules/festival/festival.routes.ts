import { Router } from 'express';

import festivalController from './festival.controller';


const router = Router();


router.get(
  '/',
  festivalController.upcoming,
);

router.get(
  '/panchang',
  festivalController.panchang,
);

router.get(
  '/today',
  festivalController.today,
);


export default router;