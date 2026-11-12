import mongoose from 'mongoose';
import { jest } from '@jest/globals';
import User from '../models/User.js';
import { authorizeRoles } from '../middleware/roleMiddleware.js';

function responseDouble() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

describe('authentication foundations', () => {
  test('User schema restricts roles and excludes password by default', async () => {
    const user = new User({
      name: 'Test User',
      email: 'test@example.test',
      password: 'DevelopmentOnly123!',
      role: 'invalid',
    });
    const error = await user.validate().catch((validationError) => validationError);

    expect(error.errors.role).toBeDefined();
    expect(User.schema.path('password').options.select).toBe(false);
  });

  test('role middleware permits configured roles and rejects others', () => {
    const next = jest.fn();
    const allowedRequest = { user: { role: 'admin' } };
    const deniedRequest = { user: { role: 'clinician' } };
    const allowedResponse = responseDouble();
    const deniedResponse = responseDouble();

    authorizeRoles('admin')(allowedRequest, allowedResponse, next);
    authorizeRoles('admin')(deniedRequest, deniedResponse, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(allowedResponse.statusCode).toBe(200);
    expect(deniedResponse.statusCode).toBe(403);
    expect(deniedResponse.body.success).toBe(false);
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });
});
