import * as z from 'zod';

// Per CLAUDE.md: >= 12 chars, with at least one uppercase, lowercase, digit, and
// special character, and common weak passwords are rejected. The backend
// enforces its own complexity rule independently; this is the client-side mirror
// so users get immediate, stricter feedback.
const COMMON_WEAK_PASSWORDS = new Set([
    '111111',
    '123456',
    '12345678',
    '123456789',
    '1234567890',
    'abc123',
    'admin',
    'admin123',
    'changeme',
    'iloveyou',
    'letmein',
    'password',
    'password1',
    'password123',
    'qwerty',
    'qwerty123',
    'superman',
    'welcome',
]);

export const passwordRules = {
    maxLength: 100,
    minLength: 12,
} as const;

export const passwordSchema = z
    .string()
    .min(passwordRules.minLength, { message: `Password must be at least ${passwordRules.minLength} characters` })
    .max(passwordRules.maxLength, { message: `Password must not exceed ${passwordRules.maxLength} characters` })
    .refine((password) => /[A-Z]/.test(password), { message: 'Add at least one uppercase letter' })
    .refine((password) => /[a-z]/.test(password), { message: 'Add at least one lowercase letter' })
    .refine((password) => /[0-9]/.test(password), { message: 'Add at least one number' })
    .refine((password) => /[^A-Za-z0-9]/.test(password), { message: 'Add at least one special character' })
    .refine((password) => !COMMON_WEAK_PASSWORDS.has(password.toLowerCase()), {
        message: 'This password is too common',
    });

export interface PasswordRequirement {
    label: string;
    met: (password: string) => boolean;
}

// Ordered checklist surfaced live in the create/reset dialogs.
export const passwordRequirements: PasswordRequirement[] = [
    { label: `At least ${passwordRules.minLength} characters`, met: (p) => p.length >= passwordRules.minLength },
    { label: 'One uppercase letter', met: (p) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', met: (p) => /[a-z]/.test(p) },
    { label: 'One number', met: (p) => /[0-9]/.test(p) },
    { label: 'One special character', met: (p) => /[^A-Za-z0-9]/.test(p) },
    { label: 'Not a common password', met: (p) => p.length > 0 && !COMMON_WEAK_PASSWORDS.has(p.toLowerCase()) },
];

// Generates a strong random password that satisfies the rules above. Used by the
// admin "reset password" action to suggest a value the admin shares out of band.
export const generateStrongPassword = (length = 16): string => {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghijkmnpqrstuvwxyz';
    const digits = '23456789';
    const special = '!@#$&*';
    const all = upper + lower + digits + special;

    const pick = (set: string) => set[Math.floor(Math.random() * set.length)];

    const required = [pick(upper), pick(lower), pick(digits), pick(special)];
    const rest = Array.from({ length: Math.max(length, passwordRules.minLength) - required.length }, () => pick(all));

    // Shuffle so the required characters are not always at the front.
    const chars = [...required, ...rest];

    for (let i = chars.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    return chars.join('');
};
