import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';

const themes = [
  { id: 'light', label: 'Light Theme', color: 'bg-gray-100 border-gray-300 text-gray-800' },
  { id: 'dark', label: 'Dark Theme', color: 'bg-gray-800 border-gray-600 text-white' },
  { id: 'blue', label: 'Blue Theme', color: 'bg-slate-900 border-slate-700 text-white' },
  { id: 'green', label: 'Green Theme', color: 'bg-emerald-950 border-emerald-800 text-white' }
];

export default function ThemeSwitcher() {
  const { theme, changeTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition-colors bg-white shadow-sm border border-gray-200"
        title="Switch Theme"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
          {themes.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                changeTheme(t.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center px-4 py-3 text-sm hover:bg-gray-50 transition-colors ${theme === t.id ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'}`}
            >
              <span className={`w-4 h-4 rounded-full border mr-3 ${t.color}`}></span>
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
