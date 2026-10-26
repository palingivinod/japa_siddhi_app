import {
  Request,
  Response,
  NextFunction,
} from 'express';

import masterService from './master.service';

import apiResponse from '../../utils/apiResponse';



class MasterController {


  async countries(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {


      const result =
        await masterService.getCountries();


      return apiResponse.success(
        res,
        'Countries fetched successfully',
        result,
      );


    } catch(error) {

      next(error);

    }

  }



  async states(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {


      const result =
        await masterService.getStates(
          Number(req.params.countryId),
        );


      return apiResponse.success(
        res,
        'States fetched successfully',
        result,
      );


    } catch(error) {

      next(error);

    }

  }



  async pincode(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const result = await masterService.lookupPincode(String(req.params.pin || ''));
      return apiResponse.success(res, 'PIN code found', result);
    } catch (error) {
      next(error);
    }
  }

  async cities(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {


      const result =
        await masterService.getCities(
          Number(req.params.stateId),
        );


      return apiResponse.success(
        res,
        'Cities fetched successfully',
        result,
      );


    } catch(error) {

      next(error);

    }

  }



  async languages(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {

    try {


      const result =
        await masterService.getLanguages();


      return apiResponse.success(
        res,
        'Languages fetched successfully',
        result,
      );


    } catch(error) {

      next(error);

    }

  }


}


export default new MasterController();