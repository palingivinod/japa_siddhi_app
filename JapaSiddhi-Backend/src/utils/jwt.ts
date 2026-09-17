import jwt, { Secret, SignOptions, JwtPayload } from 'jsonwebtoken';

import environment from '../config/environment';
import Constants from '../config/constants';

class JwtService {
  generate(payload: object): string {
    return jwt.sign(
      payload,
      environment.JWT_SECRET as Secret,
      {
        expiresIn: Constants.TOKEN_EXPIRES_IN as SignOptions['expiresIn'],
      },
    );
  }

  verify(token: string): JwtPayload | string {
    return jwt.verify(
      token,
      environment.JWT_SECRET as Secret,
    );
  }

  /**
   * Same signature check, but an already lapsed token still decodes. Used only
   * by the refresh endpoint so a devotee is never signed out for being away.
   */
  verifyIgnoringExpiry(token: string): JwtPayload | string {
    return jwt.verify(
      token,
      environment.JWT_SECRET as Secret,
      {ignoreExpiration: true},
    );
  }
}

export default new JwtService();