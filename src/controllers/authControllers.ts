import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwt.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AppError } from "../utils/AppError.js";

export const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { userName, password } = req.body;

  const [exists] = await db
    .select()
    .from(users)
    .where(eq(users.userName, userName));

  if (!exists) {
    throw new AppError("User not registered!", 404);
  }

  const isPassCorrect = await bcrypt.compare(password, exists.password);

  if (!isPassCorrect) {
    throw new AppError("Password is incorrect!", 401);
  }

  const token = generateToken({
    userId: exists.id,
    userName,
  });

  return res.status(200).json({
    message: "Login done!",
    token,
    user: {
      id: exists.id,
      userName: exists.userName,
    },
  });
});

export const registerUser = asyncHandler(
  async (req: Request, res: Response) => {
    const { userName, password } = req.body;

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.userName, userName));

    if (existingUser) {
      throw new AppError("Username exists!", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [newUser] = await db
      .insert(users)
      .values({ userName, password: hashedPassword })
      .$returningId();

    if (!newUser?.id) {
      throw new AppError("Failed to create user.", 500);
    }

    const token = generateToken({
      userId: newUser.id,
      userName,
    });

    return res.status(201).json({
      message: "Registered!",
      token,
      user: {
        id: newUser.id,
        userName,
      },
    });
  },
);

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Unauthorized", 401);
  }

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, Number(req.user.userId)))
    .limit(1);

  if (!user) {
    throw new AppError("User not found", 404);
  }

  return res
    .status(200)
    .json({ user: { id: user.id, userName: user.userName } });
});
