import React from 'react';

interface MultiSelectProps {
  label: string;
  options: string[];
  value: string[];
  onChange: (selected: string[]) => void;
  disabled?: boolean;
  error?: string;
  requiredMark?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, value, onChange, disabled, error, requiredMark }) => {
  const toggleOption = (option: string) => {
    if (disabled) return;
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
    } else {
      onChange([...value, option]);
    }
  };

  return (
    <div className="flex flex-col mb-4">
      <label className={`text-sm font-semibold mb-2 ${error ? 'text-red-600' : 'text-gray-700'}`}>
        {label} {requiredMark && <span className="text-red-500">*</span>}
      </label>
      <div className={`flex flex-wrap gap-2 p-2 rounded-md transition-all ${error ? 'border border-red-300 bg-red-50' : ''}`}>
        {options.map((option) => {
          const isSelected = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() => toggleOption(option)}
              disabled={disabled}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                isSelected
                  ? 'bg-[#3AE4B0] text-white border-[#3AE4B0]'
                  : error
                    ? 'bg-white text-red-800 border-red-200 hover:bg-red-100'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {error && <span className="text-xs text-red-600 font-semibold mt-1">{error}</span>}
    </div>
  );
};