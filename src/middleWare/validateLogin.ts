import type { NextFunction, Request, Response } from "express";

export function validateLogin(req: Request, res: Response, next: NextFunction) {
  const { userName, password } = req.body;
  if (typeof userName !== "string") {
    return res.status(400).json({
      message: "Username must be a string.",
    });
  }

  if (typeof password !== "string") {
    return res.status(400).json({
      message: "Password must be a string.",
    });
  }

  const trimUsername = userName.trim();
  const trimPassword = password.trim();

  if (!trimUsername) {
    return res.status(400).json({
      message: "Username is required.",
    });
  }

  if (!trimPassword) {
    return res.status(400).json({
      message: "Password is required.",
    });
  }

  if (trimUsername.length < 2 || trimUsername.length > 30) {
    return res.status(400).json({
      message: "Username must be between 2 and 30 characters.",
    });
  }

  const userNameregex = /^[a-zA-Z0-9_]+$/;

  if (!userNameregex.test(trimUsername)) {
    return res.status(400).json({
      message: "Username can only contain letters, numbers, and underscores.",
    });
  }

  if (trimPassword.length < 5 || trimPassword.length > 100) {
    return res.status(400).json({
      message: "Password must be between 5 and 100 characters.",
    });
  }

  req.body.userName = trimUsername;
  req.body.password = trimPassword;

  next();
}
