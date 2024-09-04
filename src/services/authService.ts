import fs from 'fs';
import * as jose from 'node-jose';
import axios, { AxiosResponse } from 'axios';
import FormData from 'form-data';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

const CLIENT_ID = '23b07e2e-e31d-4274-be67-13b38a09065c';
const KEYS_PATH = 'keys/keys.json';
const TOKEN_URL = 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token';

interface TokenResponse {
  access_token: string;
}

export class AuthService {
  public async getSignedJWT(): Promise<string> {
    try {
      const keyStore = await jose.JWK.asKeyStore(fs.readFileSync(KEYS_PATH).toString());
      const key = keyStore.get({ use: 'sig' });
      const currentTime = Math.floor(Date.now() / 1000);
      const payload = {
        iss: CLIENT_ID,
        sub: CLIENT_ID,
        aud: TOKEN_URL,
        exp: currentTime + 4 * 60,
        jti: randomUUID(),
        iat: currentTime,
        nbf: currentTime
      };

      return (await jose.JWS.createSign({ compact: true, fields: { 'type': 'jwt' } }, key)
        .update(JSON.stringify(payload))
        .final()).toString();
    } catch (error) {
      logger.error('Error generating signed JWT:', error);
      throw error;
    }
  }

  public async getAccessToken(signedJWT: string): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('grant_type', 'client_credentials');
      formData.append('client_assertion_type', 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer');
      formData.append('client_assertion', signedJWT);

      const response: AxiosResponse<TokenResponse> = await axios.post(TOKEN_URL, formData, {
        headers: formData.getHeaders()
      });
      return response.data.access_token;
    } catch (error) {
      logger.error('Error getting access token:', error?.response?.data || error);
      throw error;
    }
  }
}

export const authService = new AuthService();