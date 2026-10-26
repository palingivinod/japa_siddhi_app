import masterRepository from './master.repository';
import AppError from '../../utils/appError';

const titleCase = (value: string) =>
  value
    .toLowerCase()
    .replace(/\b[a-z]/g, letter => letter.toUpperCase());



class MasterService {


  async getCountries() {

    return masterRepository.getCountries();

  }



  async getStates(
    countryId:number,
  ) {

    return masterRepository.getStates(
      countryId,
    );

  }



  async getCities(
    stateId:number,
  ) {

    return masterRepository.getCities(
      stateId,
    );

  }



  async lookupPincode(pin: string) {
    const code = String(pin || '').replace(/\D/g, '').slice(0, 6);
    if (!/^[0-9]{6}$/.test(code)) {
      throw new AppError('Enter a 6-digit PIN code.', 400);
    }
    const response = await fetch(`https://api.postalpincode.in/pincode/${code}`);
    const body = await response.json();
    const office = body?.[0]?.PostOffice?.[0];
    if (!office || String(body?.[0]?.Status || '') !== 'Success') {
      throw new AppError('Could not find that PIN code.', 400);
    }
    const stateName = titleCase(String(office.State || '').trim());
    const cityName = titleCase(String(office.District || office.Name || '').trim());
    if (!stateName || !cityName) {
      throw new AppError('Could not find that PIN code.', 400);
    }
    const countryId = await masterRepository.findIndiaId();
    const state = await masterRepository.findOrCreateState(countryId, stateName);
    const city = await masterRepository.findOrCreateCity(
      countryId,
      state.id,
      cityName,
      code,
    );
    if (!state.id || !city.id) {
      throw new AppError('Could not find that PIN code.', 400);
    }
    return {
      pinCode: code,
      countryId,
      stateId: state.id,
      stateName: state.name,
      cityId: city.id,
      cityName: city.name,
    };
  }

  async getLanguages() {
    try {
      return await masterRepository.getLanguages();
    } catch (error) {
      console.warn('Languages database unavailable, using Node fallback data.');
      return [
        {id: 1, code: 'en', name: 'English', nativeName: 'English', isActive: 1},
        {id: 2, code: 'te', name: 'Telugu', nativeName: 'తెలుగు', isActive: 1},
        {id: 3, code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isActive: 1},
        {id: 4, code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', isActive: 1},
        {id: 5, code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', isActive: 1},
      ];
    }
  }


}


export default new MasterService();