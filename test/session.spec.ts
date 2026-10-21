import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as passport from 'passport';
import { AuthModule } from '../src/auth/auth.module';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { GoogleStrategy } from '../src/auth/google.strategy';
import { CoreModule } from '../src/core/core.module';
import { UsersModule } from '../src/users/users.module';
import { SurveysModule } from '../src/surveys/surveys.module';
import { QuestionsModule } from '../src/questions/questions.module';
import { ResponseModule } from '../src/response/response.module';
import { SurveysService } from '../src/surveys/surveys.service';
import { corsOptions, safeRequestPath } from '../src/http-config';
import { Role } from '../src/auth/roles/role.enum';

// Synthetic fixtures only. No environment files, database or provider requests.
const secret = 'local-session-regression-fixture';
const claims = {user_id: 'fixture-user', user_email: 'fixture@example.invalid', user_roles: [Role.Admin]};

describe('session HTTP and actual feature-module signer wiring', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let controller: AuthController;
  let authService: AuthService;
  let providerOutcome = 'success';
  const logs: string[] = [];

  beforeAll(async () => {
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(message => { logs.push(String(message)); });
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(message => { logs.push(String(message)); });
    jest.spyOn(Logger.prototype, 'error').mockImplementation(message => { logs.push(String(message)); });
    const builder = Test.createTestingModule({
      imports: [CoreModule, AuthModule, UsersModule, SurveysModule, QuestionsModule, ResponseModule],
    }).overrideProvider(ConfigService).useValue({
      get: (key: string, fallback?: any) => ({SECRET: secret, FRONTEND_URL: 'http://frontend.invalid'}[key] ?? fallback),
    }).overrideProvider(GoogleStrategy).useValue({})
      .overrideProvider(SurveysService).useValue({getAllSurveys: jest.fn().mockResolvedValue([])});
    for (const name of ['User', 'Survey', 'Question', 'QVQuestion', 'LikertQuestion', 'TextInputQuestion', 'SurveyResponse', 'QuestionResponse']) {
      builder.overrideProvider(getModelToken(name)).useValue({});
    }
    const moduleRef = await builder.compile();
    jwt = moduleRef.get(JwtService);
    controller = moduleRef.get(AuthController);
    authService = moduleRef.get(AuthService);
    class LocalGoogle extends passport.Strategy {
      name = 'google';
      authenticate() {
        if (providerOutcome === 'cancel') return this.fail();
        if (providerOutcome === 'error') return this.error(new Error('synthetic provider detail'));
        this.success({_id: claims.user_id, email: claims.user_email, roles: claims.user_roles});
      }
    }
    passport.use('google', new LocalGoogle());
    app = moduleRef.createNestApplication();
    app.enableCors(corsOptions);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    passport.unuse('google');
    jest.restoreAllMocks();
  });

  const token = (remaining: number, roles = [Role.Admin]) => {
    const now = Math.floor(Date.now() / 1000);
    return new JwtService({secret}).sign({...claims, user_roles: roles, iat: now - 3600, exp: now + remaining});
  };

  it('validates a bounded session and returns only allowlisted claims with no-store', async () => {
    const credential = token(3600);
    const response = await request(app.getHttpServer()).get('/api/v1/auth/session')
      .set('Authorization', `Bearer ${credential}`).expect(200);
    expect(response.body).toEqual({user: {id: claims.user_id, email: claims.user_email, roles: [Role.Admin]}, expiresAt: expect.any(Number)});
    expect(response.body.expiresAt).toBe(jwt.decode(credential)['exp']);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-new-access-token']).toBeUndefined();
    expect(JSON.stringify(response.body)).not.toMatch(/access_token|password/);
  });

  it.each(['missing', 'invalid', 'expired', 'boundary', 'unbounded', 'bad-identity'])('rejects %s credentials without renewal', async kind => {
    let credential: string;
    if (kind === 'invalid') credential = 'invalid.synthetic.credential';
    if (kind === 'expired') credential = token(-1);
    if (kind === 'boundary') credential = token(0);
    if (kind === 'unbounded') credential = new JwtService({secret}).sign(claims);
    if (kind === 'bad-identity') credential = jwt.sign({...claims, user_email: null});
    const call = request(app.getHttpServer()).get('/api/v1/auth/session');
    if (credential) call.set('Authorization', `Bearer ${credential}`);
    const response = await call.expect(401);
    expect(response.headers['x-new-access-token']).toBeUndefined();
  });

  it('renews using the configured signer inside the actual SurveysModule route', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/protected/surveys')
      .set('Authorization', `Bearer ${token(60)}`).set('Origin', 'http://frontend.invalid').expect(200);
    const renewed = jwt.verify(response.headers['x-new-access-token']);
    expect(renewed).toMatchObject(claims);
    expect(renewed.exp - renewed.iat).toBe(604800);
    expect(response.headers['access-control-expose-headers']).toBe('X-New-Access-Token');
    expect(response.headers['access-control-allow-origin']).toBe('http://frontend.invalid');
    expect(response.headers['cache-control']).toContain('no-store');
  });

  it('keeps the Admin-only list forbidden to Designer while admitting its session', async () => {
    const credential = token(3600, [Role.Designer]);
    await request(app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${credential}`).expect(200);
    await request(app.getHttpServer()).get('/api/v1/protected/surveys').set('Authorization', `Bearer ${credential}`).expect(403);
  });

  it('completes a mocked provider login, validates the issued JWT, renews, then rejects expiry repeatedly', async () => {
    for (let cycle = 0; cycle < 2; cycle++) {
      providerOutcome = 'success';
      const callback = await request(app.getHttpServer()).get('/api/v1/redirect').expect(302);
      const credential = new URL(callback.headers.location).searchParams.get('token');
      expect(jwt.verify(credential)).toMatchObject(claims);
      await request(app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${credential}`).expect(200);
      const renewed = await request(app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${token(60)}`).expect(200);
      expect(jwt.verify(renewed.headers['x-new-access-token'])).toMatchObject(claims);
      await request(app.getHttpServer()).get('/api/v1/auth/session').set('Authorization', `Bearer ${token(-1)}`).expect(401);
    }
  });

  it.each(['cancel', 'error'])('redirects provider %s before the controller without exposing details', async outcome => {
    providerOutcome = outcome;
    const response = await request(app.getHttpServer()).get('/api/v1/redirect').expect(302);
    expect(response.headers.location).toBe('http://frontend.invalid/login?error=oauth');
    expect(response.text).not.toContain('synthetic provider detail');
    providerOutcome = 'success';
  });

  it('does not emit token=undefined or provider internals when login data is absent or signing fails', () => {
    const response = {redirect: jest.fn(), setHeader: jest.fn()};
    controller.googleAuthRedirect({}, response);
    expect(response.redirect).toHaveBeenLastCalledWith('http://frontend.invalid/login?error=oauth');
    controller.googleAuthRedirect({user: {}}, response);
    expect(response.redirect).toHaveBeenLastCalledWith('http://frontend.invalid/login?error=oauth');
    expect(response.setHeader).not.toHaveBeenCalled();
    const failure = jest.spyOn(authService, 'googleLogin').mockImplementationOnce(() => { throw new Error('synthetic internal detail'); });
    controller.googleAuthRedirect({user: {}}, response);
    expect(response.redirect).toHaveBeenLastCalledWith('http://frontend.invalid/login?error=oauth');
    failure.mockRestore();
  });

  it('excludes synthetic query credentials from safe log paths and auth logs', () => {
    const query = '/login-success?token=fixture-credential&email=fixture@example.invalid&code=fixture-code&state=fixture-state';
    expect(safeRequestPath(query)).toBe('/login-success');
    expect(safeRequestPath('/api/v1/redirect?code=fixture-code&state=fixture-state')).toBe('/api/v1/redirect');
    expect(logs.join(' ')).not.toContain(claims.user_email);
    expect(logs.join(' ')).not.toContain('fixture-credential');
    expect(logs.join(' ')).not.toContain('synthetic provider detail');
  });
});
