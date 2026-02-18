const { validateEmail, validatePasswordStrength, validateAdminSecret } = require('../utils/validator');

describe('Validator Utility Unit Tests', () => {

    test('should validate correct emails', () => {
        expect(validateEmail('test@example.com')).toBe(true);
        expect(validateEmail('user.name@domain.co.in')).toBe(true);
    });

    test('should reject invalid emails', () => {
        expect(validateEmail('invalid-email')).toBe(false);
        expect(validateEmail('test@')).toBe(false);
        expect(validateEmail('@domain.com')).toBe(false);
    });

    test('should validate password length (min 6)', () => {
        expect(validatePasswordStrength('123456')).toBe(true);
        expect(validatePasswordStrength('password123')).toBe(true);
    });

    test('should reject short passwords', () => {
        expect(validatePasswordStrength('12345')).toBe(false);
        expect(validatePasswordStrength('')).toBe(false);
    });

    test('should validate admin secret key correctly', () => {
        const actualSecret = 'supersecret123';
        expect(validateAdminSecret('supersecret123', actualSecret)).toBe(true);
        expect(validateAdminSecret('wrongsecret', actualSecret)).toBe(false);
    });
});
