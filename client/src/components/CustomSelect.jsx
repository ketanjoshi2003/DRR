import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({
    options,
    value,
    onChange,
    icon: Icon,
    placeholder = "Select option",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    flex items-center gap-2 w-full bg-white dark:bg-zinc-900 border rounded-lg px-3 py-2 text-sm text-left transition-all duration-200 outline-none
                    ${isOpen
                        ? 'border-brand-500 ring-4 ring-brand-500/10 dark:ring-brand-500/20'
                        : 'border-gray-200 dark:border-zinc-800 hover:border-brand-400 dark:hover:border-brand-600 hover:shadow-sm'
                    }
                `}
            >
                {Icon && <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                <span className={`block truncate flex-1 ${selectedOption ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-500'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full min-w-[200px] bg-white dark:bg-zinc-900 shadow-xl dark:shadow-black/50 rounded-lg border border-gray-100 dark:border-zinc-800 py-1 overflow-auto max-h-60 animate-fade-in scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                    {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`
                                cursor-pointer select-none relative py-2.5 pl-3 pr-9 text-sm transition-colors duration-150
                                ${option.value === value
                                    ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-900 dark:text-brand-400'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 hover:text-brand-600 dark:hover:text-brand-400'
                                }
                            `}
                        >
                            <span className={`block truncate ${option.value === value ? 'font-medium' : 'font-normal'}`}>
                                {option.label}
                            </span>
                            {option.value === value && (
                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-600 dark:text-brand-400">
                                    <Check className="w-4 h-4" />
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
