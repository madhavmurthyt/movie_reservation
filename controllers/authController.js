import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { User } from '../models/index.js';
import { ApiError } from '../utils/apiError.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const TOKEN_EXPIRY = '24h';

export async function register(req, res, next) {
  try {
    const { username, password } = req.body;

    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return next(new ApiError(409, 'Username already exists'));
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash });

    res.status(201).json({
      id: user.id,
      username: user.username,
      role: user.role
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ where: { username } });
    if (!user) {
      return next(new ApiError(401, 'Invalid username or password'));
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return next(new ApiError(401, 'Invalid username or password'));
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    res.json({ token });
  } catch (error) {
    next(error);
  }
}

export async function promoteToAdmin(req, res, next) {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId);
    if (!user) {
      return next(new ApiError(404, 'User not found'));
    }

    if (user.role === 'admin') {
      return next(new ApiError(400, 'User is already an admin'));
    }

    user.role = 'admin';
    await user.save();

    res.json({
      id: user.id,
      username: user.username,
      role: user.role
    });
  } catch (error) {
    next(error);
  }
}

