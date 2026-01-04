import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User } from '../models/index.js';

dotenv.config();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export async function seedAdmin() {
  const existingAdmin = await User.findOne({
    where: { username: ADMIN_USERNAME }
  });

  if (existingAdmin) {
    console.log(`Admin user "${ADMIN_USERNAME}" already exists.`);
    return existingAdmin;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await User.create({
    username: ADMIN_USERNAME,
    passwordHash,
    role: 'admin'
  });

  console.log(`Admin user "${ADMIN_USERNAME}" created successfully.`);
  return admin;
}

