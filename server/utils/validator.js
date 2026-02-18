/**
 * Simple validation utility for Unit Testing demonstration
 */

const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
};

const validatePasswordStrength = (password) => {
    // At least 6 characters
    return !!(password && password.length >= 6);
};

const validateAdminSecret = (providedSecret, actualSecret) => {
    if (!actualSecret) return false;
    return providedSecret === actualSecret;
};

module.exports = {
    validateEmail,
    validatePasswordStrength,
    validateAdminSecret
};
