// Local development only (imported when NODE_ENV !== 'production').
import bcrypt from 'bcryptjs';
import { User } from './models/User.js';

export const DEV_USERNAME = 'dev';
export const DEV_PASSWORD = 'devpassword';

export async function ensureDevUser() {
  if (await User.exists({ username: DEV_USERNAME })) return;
  await User.create({ username: DEV_USERNAME, passwordHash: await bcrypt.hash(DEV_PASSWORD, 10) });
  console.log(`Created local test account "${DEV_USERNAME}" (dev only)`);
}
