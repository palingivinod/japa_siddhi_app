import { Router } from 'express';

import masterController from './master.controller';


const router = Router();


router.get(
  '/countries',
  masterController.countries,
);


router.get(
  '/states/:countryId',
  masterController.states,
);


router.get(
  '/cities/:stateId',
  masterController.cities,
);

router.get(
  '/pincode/:pin',
  masterController.pincode,
);


router.get(
  '/languages',
  masterController.languages,
);


export default router;