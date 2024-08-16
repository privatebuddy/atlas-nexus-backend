import { Document } from 'mongoose';

export interface User extends Document {
  readonly userId: string;
  readonly threadId: string;
  readonly status: string;
}
