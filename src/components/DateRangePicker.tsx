import React from 'react';

interface DateRangePickerProps {
  fromDate: Date;
  toDate: Date;
  onFromDateChange: (date: Date) => void;
  onToDateChange: (date: Date) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
}) => {
  return (
    <div className="flex gap-4 items-center">
      <div className="flex flex-col">
        <label htmlFor="fromDate" className="text-sm text-gray-600 mb-1">
          From Date
        </label>
        <input
          type="date"
          id="fromDate"
          value={fromDate.toISOString().split('T')[0]}
          onChange={(e) => onFromDateChange(new Date(e.target.value))}
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="toDate" className="text-sm text-gray-600 mb-1">
          To Date
        </label>
        <input
          type="date"
          id="toDate"
          value={toDate.toISOString().split('T')[0]}
          onChange={(e) => onToDateChange(new Date(e.target.value))}
          className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          min={fromDate.toISOString().split('T')[0]}
        />
      </div>
    </div>
  );
};
