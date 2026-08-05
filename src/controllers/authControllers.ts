import type { Request, Response } from "express";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwt.js";

export async function loginUser(req: Request, res: Response) {
  try {
    const { userName, password } = req.body;

    const [exists] = await db
      .select()
      .from(users)
      .where(eq(users.userName, userName));

    if (!exists) {
      return res.status(404).json({ message: "User not registered!" });
    }

    const isPassCorrect = await bcrypt.compare(password, exists.password);

    if (!isPassCorrect) {
      return res.status(401).json({ message: "Password is incorrect!" });
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
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

export async function registerUser(req: Request, res: Response) {
  try {
    const { userName, password } = req.body;

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.userName, userName));

    if (existingUser) {
      return res.status(409).json({ message: "Username exists!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [newUser] = await db
      .insert(users)
      .values({ userName, password: hashedPassword })
      .$returningId();
      
    if (!newUser?.id) {
      return res.status(500).json({ message: "Failed to create user." });
    }
    const token = generateToken({
      userId: newUser!.id,
      userName,
    });

    return res.status(201).json({
      message: "Registered!",
      token,
      user: { id: newUser?.id, userName },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error!" });
  }
}
