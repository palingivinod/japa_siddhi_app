import {Router} from 'express';
import mantraController from './mantra.controller';

const router = Router();

router.get('/categories', mantraController.categories);
router.get('/', mantraController.list);

export default router;
