import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen } from 'lucide-react';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('reader');
    const [phone, setPhone] = useState('');
    const [instituteId, setInstituteId] = useState('');
    const [error, setError] = useState('');
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await register(name, email, password, role, phone, instituteId);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to register');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-fade-in transition-colors duration-150">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <BookOpen className="w-12 h-12 text-brand-600" />
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100 transition-colors">
                    Create your account
                </h2>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white dark:bg-zinc-950 py-8 px-4 border border-gray-200 dark:border-zinc-800 rounded-xl sm:px-10 shadow-sm dark:shadow-zinc-900/50 transition-colors">
                    <form className="space-y-6" onSubmit={handleSubmit}>
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 px-4 py-3 rounded text-sm transition-colors">
                                {error}
                            </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                                    Full Name
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="name"
                                        name="name"
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-zinc-800 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-brand-500 dark:focus:ring-brand-500 focus:border-brand-500 dark:focus:border-brand-500 sm:text-sm transition-all duration-200"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                                    Phone Number
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-zinc-800 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-brand-500 dark:focus:ring-brand-500 focus:border-brand-500 dark:focus:border-brand-500 sm:text-sm transition-all duration-200"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                                    Email address
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-zinc-800 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-brand-500 dark:focus:ring-brand-500 focus:border-brand-500 dark:focus:border-brand-500 sm:text-sm transition-all duration-200"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="instituteId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                                    Institute ID
                                </label>
                                <div className="mt-1">
                                    <input
                                        id="instituteId"
                                        name="instituteId"
                                        type="text"
                                        value={instituteId}
                                        onChange={(e) => setInstituteId(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-zinc-800 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-brand-500 dark:focus:ring-brand-500 focus:border-brand-500 dark:focus:border-brand-500 sm:text-sm transition-all duration-200"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-zinc-800 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-brand-500 dark:focus:ring-brand-500 focus:border-brand-500 dark:focus:border-brand-500 sm:text-sm transition-all duration-200"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                                Role
                            </label>
                            <div className="mt-1">
                                <select
                                    id="role"
                                    name="role"
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 dark:border-zinc-800 rounded-md shadow-sm bg-white dark:bg-zinc-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-brand-500 dark:focus:ring-brand-500 focus:border-brand-500 dark:focus:border-brand-500 sm:text-sm transition-all duration-200"
                                >
                                    <option value="reader">Reader / Student</option>
                                    <option value="librarian">Librarian</option>
                                    <option value="admin">Admin</option>
                                    <option value="guest">Guest</option>
                                </select>
                            </div>
                        </div>


                        <div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-brand-600 dark:bg-brand-700 hover:bg-brand-700 dark:hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-200 shadow-brand-500/20"
                            >
                                Register
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300 dark:border-zinc-800" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white dark:bg-zinc-950 text-gray-500 dark:text-gray-400 transition-colors">
                                    Already have an account?
                                </span>
                            </div>
                        </div>

                        <div className="mt-6">
                            <Link
                                to="/login"
                                className="w-full flex justify-center py-2.5 px-4 border border-gray-300 dark:border-zinc-800 rounded-lg shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition-all duration-200"
                            >
                                Sign in
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
