import { z } from 'zod';

import { fr } from '@/i18n/fr';
import { PASSWORD_MIN_LENGTH } from './passwordStrength';

const v = fr.auth.validation;

const email = z
  .string()
  .trim()
  .pipe(z.email({ message: v.email }));
const password = z.string().min(PASSWORD_MIN_LENGTH, { message: v.passwordLength });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { message: v.passwordRequired }),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const signupSchema = z.object({
  firstName: z.string().trim().min(1, { message: v.firstName }).max(40, { message: v.firstName }),
  email,
  password,
  acceptTerms: z.boolean().refine((accepted) => accepted, { message: v.terms }),
});
export type SignupValues = z.infer<typeof signupSchema>;

export const newPasswordSchema = z.object({ password });
export type NewPasswordValues = z.infer<typeof newPasswordSchema>;

export const emailSchema = email;
