import { Connection } from 'mongoose';
import { UserSchema } from './schemas/user.schema';
import { DATABASE_CONNECTION } from '../database/constants';
import { USER_MODEL } from './constants';

export const assistantProviders = [
  {
    provide: USER_MODEL,
    useFactory: (connection: Connection) =>
      connection.model('User', UserSchema),
    inject: [DATABASE_CONNECTION],
  },
];
