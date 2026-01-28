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
                    flex items-center gap-2 w-full bg-white border rounded-lg px-3 py-2 text-sm text-left transition-all duration-200 outline-none
                    ${isOpen ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-gray-200 hover:border-brand-400 hover:shadow-sm'}
                `}
            >
                {Icon && <Icon className="w-4 h-4 text-gray-500" />}
                <span className={`block truncate flex-1 ${selectedOption ? 'text-gray-700' : 'text-gray-500'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-2 w-full min-w-[200px] bg-white shadow-xl rounded-lg border border-gray-100 py-1 overflow-auto max-h-60 animate-fade-in scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                    {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            className={`
                                cursor-pointer select-none relative py-2.5 pl-3 pr-9 text-sm transition-colors duration-150
                                ${option.value === value ? 'bg-brand-50 text-brand-900' : 'text-gray-700 hover:bg-gray-50 hover:text-brand-600'}
                            `}
                        >
                            <span className={`block truncate ${option.value === value ? 'font-medium' : 'font-normal'}`}>
                                {option.label}
                            </span>
                            {option.value === value && (
                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-brand-600">
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
