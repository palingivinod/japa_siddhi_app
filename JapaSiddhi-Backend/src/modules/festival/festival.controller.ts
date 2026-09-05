import {
  Request,
  Response,
  NextFunction,
} from 'express';

import festivalService from './festival.service';

import apiResponse from '../../utils/apiResponse';



class FestivalController {


  async upcoming(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const result =
        await festivalService.getUpcomingFestivals();


      return apiResponse.success(
        res,
        'Festivals fetched successfully',
        result,
      );


    } catch(error) {

      next(error);

    }

  }



  async panchang(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const rawDate = req.query.date;
      const rawLang = req.query.lang;
      const date = typeof rawDate === 'string' ? rawDate : undefined;
      const lang = typeof rawLang === 'string' ? rawLang : undefined;
      const result = await festivalService.getPanchang(date, lang);
      return apiResponse.success(
        res,
        'Panchang fetched successfully',
        result,
      );
    } catch (error) {
      next(error);
    }
  }

  async today(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {

      const result =
        await festivalService.getTodayFestival();


      return apiResponse.success(
        res,
        'Today festival fetched successfully',
        result,
      );


    } catch(error) {

      next(error);

    }

  }


}


export default new FestivalController();