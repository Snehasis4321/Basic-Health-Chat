'use client';

import { useState, useEffect } from 'react';

interface LanguageSelectorProps {
  value: string;
  onChange: (language: string) => void;
  disabled?: boolean;
  className?: string;
}

interface Language {
  code: string;
  name: string;
  nativeName: string;
}

// Supported languages based on OpenAI's translation capabilities
const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
];

export default function LanguageSelector({
  value,
  onChange,
  disabled = false,
  className = '',
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | undefined>(
    SUPPORTED_LANGUAGES.find((lang) => lang.code === value)
  );

  // Update selected language when value prop changes
  useEffect(() => {
    const language = SUPPORTED_LANGUAGES.find((lang) => lang.code === value);
    setSelectedLanguage(language);
  }, [value]);

  const handleSelect = (language: Language) => {
    setSelectedLanguage(language);
    onChange(language.code);
    setIsOpen(false);
    
    // Store preference in session storage
    sessionStorage.setItem('preferredLanguage', language.code);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.language-selector')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className={`language-selector relative ${className}`}>
      {/* Selected Language Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-1.5 
          text-sm font-medium
          border border-gray-300 dark:border-gray-600 
          rounded-lg 
          bg-white dark:bg-gray-700 
          text-gray-900 dark:text-white
          hover:bg-gray-50 dark:hover:bg-gray-600
          focus:outline-none focus:ring-2 focus:ring-blue-500
          transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label="Select language"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {/* Globe Icon */}
        <svg
          className="w-4 h-4 text-gray-600 dark:text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
          />
        </svg>

        {/* Selected Language */}
        <span className="hidden sm:inline">
          {selectedLanguage?.nativeName || 'Select Language'}
        </span>
        <span className="sm:hidden">
          {selectedLanguage?.code.toUpperCase() || 'Lang'}
        </span>

        {/* Dropdown Arrow */}
        <svg
          className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="
            absolute right-0 mt-2 
            w-64 
            bg-white dark:bg-gray-800 
            border border-gray-200 dark:border-gray-700 
            rounded-lg 
            shadow-lg 
            z-50
            max-h-80 
            overflow-y-auto
          "
          role="listbox"
          aria-label="Language options"
        >
          {SUPPORTED_LANGUAGES.map((language) => (
            <button
              key={language.code}
              type="button"
              onClick={() => handleSelect(language)}
              className={`
                w-full px-4 py-2.5 
                text-left text-sm
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors
                flex items-center justify-between
                ${
                  selectedLanguage?.code === language.code
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'text-gray-900 dark:text-white'
                }
              `}
              role="option"
              aria-selected={selectedLanguage?.code === language.code}
            >
              <div className="flex flex-col">
                <span className="font-medium">{language.nativeName}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{language.name}</span>
              </div>

              {/* Checkmark for selected language */}
              {selectedLanguage?.code === language.code && (
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { SUPPORTED_LANGUAGES };
export type { Language };
