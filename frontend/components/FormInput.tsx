
import React from 'react';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  requiredMark?: boolean;
  labelClassName?: string;
}

export const FormInput: React.FC<FormInputProps> = ({ label, error, requiredMark, className, labelClassName, ...props }) => {
  return (
    <div className="flex flex-col mb-4">
      <label className={`text-sm font-semibold mb-1 ${error ? 'text-red-600' : (labelClassName || 'text-gray-700')}`}>
        {label} {requiredMark && <span className="text-red-500">*</span>}
      </label>
      <input
        className={`border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
          props.disabled
            ? 'bg-gray-100 text-gray-700 cursor-not-allowed border-gray-300'
            : error
                ? 'bg-red-50 border-red-500 focus:ring-red-500 text-red-900 placeholder-red-300'
                : 'bg-white border-gray-300 focus:ring-[#3AE4B0] text-gray-900'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-600 font-semibold mt-1">{error}</span>}
    </div>
  );
};
