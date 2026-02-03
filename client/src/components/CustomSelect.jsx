import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

const CustomSelect = ({
    options,
    value,
    onChange,
    icon: Icon,
    placeholder = "Select option",
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [openUpward, setOpenUpward] = useState(false);
    const containerRef = useRef(null);
    const searchInputRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value);

    const filteredOptions = useMemo(() => {
        return options.filter(opt =>
            opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (opt.value && opt.value.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [options, searchTerm]);

    const handleToggle = () => {
        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            // If less than 300px below (typical dropdown height + padding), open upward
            setOpenUpward(spaceBelow < 300);
        }
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                type="button"
                onClick={handleToggle}
                className={`
                    flex items-center gap-2.5 w-full bg-white dark:bg-zinc-950 border rounded-lg px-3 py-2 text-sm text-left transition-all duration-300 outline-none
                    ${isOpen
                        ? 'border-brand-500 ring-4 ring-brand-500/10 dark:ring-brand-500/20 shadow-lg'
                        : 'border-gray-300 dark:border-zinc-800 hover:border-brand-400 dark:hover:border-brand-600 hover:shadow-md'
                    }
                `}
            >
                {Icon && (
                    <div className={`p-1 rounded-md transition-colors ${isOpen ? 'bg-brand-50 dark:bg-brand-900/20' : 'bg-gray-50 dark:bg-zinc-900'}`}>
                        <Icon className={`w-3.5 h-3.5 ${isOpen ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 dark:text-zinc-500'}`} />
                    </div>
                )}
                <span className={`block truncate flex-1 font-semibold ${selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-zinc-500 font-medium'}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-zinc-600 transition-transform duration-300 ${isOpen ? 'rotate-180 text-brand-500' : ''}`} />
            </button>

            {isOpen && (
                <div
                    className={`
                        absolute z-[300] w-full bg-white dark:bg-zinc-900 shadow-2xl dark:shadow-black/60 rounded-xl border border-gray-100 dark:border-zinc-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200
                        ${openUpward
                            ? 'bottom-full mb-2 origin-bottom'
                            : 'top-full mt-2 origin-top'
                        }
                    `}
                >
                    {/* Search Header */}
                    <div className="p-2 border-b border-gray-100 dark:border-zinc-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search..."
                                className="w-full pl-9 pr-8 py-2 text-xs bg-gray-50 dark:bg-zinc-950 border border-gray-100 dark:border-zinc-800 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 transition-all font-medium"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Options List */}
                    <div className="overflow-y-auto max-h-60 custom-scrollbar py-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <div
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                        setSearchTerm('');
                                    }}
                                    className={`
                                        group cursor-pointer select-none relative py-2 pl-3.5 pr-10 text-sm transition-all duration-200
                                        ${option.value === value
                                            ? 'bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800/80 hover:text-brand-600 dark:hover:text-brand-400'
                                        }
                                    `}
                                >
                                    <span className={`block truncate ${option.value === value ? 'font-bold' : 'font-semibold group-hover:translate-x-1 transition-transform'}`}>
                                        {option.label}
                                    </span>
                                    {option.value === value && (
                                        <span className="absolute inset-y-0 right-4 flex items-center text-brand-600 dark:text-brand-400 animate-in zoom-in-0 duration-300">
                                            <Check className="w-4 h-4" />
                                        </span>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="py-8 px-4 text-center">
                                <Search className="w-8 h-8 text-gray-200 dark:text-zinc-800 mx-auto mb-2" />
                                <p className="text-xs text-gray-400 font-medium tracking-wide">No results found for "{searchTerm}"</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
