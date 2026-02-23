import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { BookOpen, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import api from '../api/axios';

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [status, setStatus] = useState('idle'); // idle | loading | success | error
    const [message, setMessage] = useState('');

    // Password strength checker
    const getPasswordStrength = (pass) => {
        if (!pass) return { level: 0, label: '', color: '' };
        let score = 0;
        if (pass.length >= 6) score++;
        if (pass.length >= 8) score++;
        if (/[A-Z]/.test(pass)) score++;
        if (/[0-9]/.test(pass)) score++;
        if (/[^A-Za-z0-9]/.test(pass)) score++;

        if (score <= 2) return { level: score, label: 'Weak', color: 'bg-red-500' };
        if (score <= 3) return { level: score, label: 'Fair', color: 'bg-yellow-500' };
        if (score <= 4) return { level: score, label: 'Good', color: 'bg-blue-500' };
        return { level: score, label: 'Strong', color: 'bg-green-500' };
    };

    const strength = getPasswordStrength(password);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        if (password !== confirmPassword) {
            setStatus('error');
            setMessage('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setStatus('error');
            setMessage('Password must be at least 6 characters long.');
            return;
        }

        setStatus('loading');
        try {
            const { data } = await api.post(`/auth/reset-password/${token}`, { password });
            setStatus('success');
            setMessage(data.message);
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.message || 'Something went wrong. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-fade-in transition-colors duration-150">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <BookOpen className="w-12 h-12 text-brand-600" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                    Reset your password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                    Create a new, strong password for your account.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-zinc-950 py-8 px-4 border border-gray-200 dark:border-zinc-800 rounded-xl sm:px-10 shadow-sm dark:shadow-zinc-900/50">

                    {status === 'success' ? (
                        <div className="text-center space-y-4">
                            <div className="flex justify-center">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                                    <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                Password Reset Successful!
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {message}
                            </p>
                            <div className="pt-4">
                                <Link
                                    to="/login"
                                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all shadow-brand-500/20"
                                >
                                    Go to Login
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            {status === 'error' && (
                                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg text-sm flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                    <span>{message}</span>
                                </div>
                            )}

                            {/* New Password */}
                            <div>
                                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    New Password
                                </label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <input
                                        id="new-password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter new password"
                                        className="appearance-none block w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-zinc-800 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>

                                {/* Password Strength Meter */}
                                {password && (
                                    <div className="mt-2">
                                        <div className="flex gap-1 mb-1">
                                            {[1, 2, 3, 4, 5].map((i) => (
                                                <div
                                                    key={i}
                                                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= strength.level
                                                            ? strength.color
                                                            : 'bg-gray-200 dark:bg-zinc-800'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <p className={`text-xs ${strength.label === 'Weak' ? 'text-red-500' :
                                                strength.label === 'Fair' ? 'text-yellow-500' :
                                                    strength.label === 'Good' ? 'text-blue-500' :
                                                        'text-green-500'
                                            }`}>
                                            {strength.label} password
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Confirm Password
                                </label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <input
                                        id="confirm-password"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="Confirm new password"
                                        className={`appearance-none block w-full pl-10 pr-10 py-2.5 border rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-all ${confirmPassword && confirmPassword !== password
                                                ? 'border-red-300 dark:border-red-900'
                                                : confirmPassword && confirmPassword === password
                                                    ? 'border-green-300 dark:border-green-900'
                                                    : 'border-gray-300 dark:border-zinc-800'
                                            }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {confirmPassword && confirmPassword !== password && (
                                    <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                                )}
                                {confirmPassword && confirmPassword === password && (
                                    <p className="mt-1 text-xs text-green-500 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Passwords match
                                    </p>
                                )}
                            </div>

                            <div>
                                <button
                                    type="submit"
                                    disabled={status === 'loading' || !password || !confirmPassword}
                                    className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all shadow-brand-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                    {status === 'loading' ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Resetting...
                                        </>
                                    ) : (
                                        'Reset Password'
                                    )}
                                </button>
                            </div>

                            <div className="text-center">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to login
                                </Link>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
