import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;
const expiresIn = "30d";

export interface Tokenpayload {
  userId: string | number;
  userName: string;
}

export function generateToken(payload: Tokenpayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: expiresIn });
}

export function verifyToken(token: string): Tokenpayload {
  return jwt.verify(token, JWT_SECRET) as Tokenpayload;
}
