import z from "zod";

const usernameSchema = z
  .string()
  .trim()
  .min(2, "Username must be between 2 and 30 characters.")
  .max(30, "Username must be between 2 and 30 characters.")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username can only contain letters, numbers, and underscores.",
  );

const passwordSchema = z
  .string()
  .trim()
  .min(5, "Password must be between 5 and 100 characters.")
  .max(100, "Password must be between 5 and 100 characters.");

export const loginSchema = z.object({
  userName: usernameSchema,
  password: passwordSchema,
});

export const registrationSchema = z
  .object({
    userName: usernameSchema,
    password: passwordSchema,
    confirmPassword: z.string().trim(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
