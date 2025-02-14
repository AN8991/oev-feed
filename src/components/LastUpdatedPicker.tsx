import { ChangeEvent } from 'react';

interface LastUpdatedPickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

export function LastUpdatedPicker({ value, onChange }: LastUpdatedPickerProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    onChange(date);
  };

  return (
    <div className="flex flex-col">
      <label htmlFor="lastUpdated" className="mb-2 text-sm font-medium text-gray-700">
        Last Updated
      </label>
      <input
        type="date"
        id="lastUpdated"
        value={value.toISOString().split('T')[0]}
        onChange={handleChange}
        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
