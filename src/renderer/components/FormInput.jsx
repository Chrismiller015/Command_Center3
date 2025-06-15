import React from 'react';

const FormInput = ({ field, value, onChange, isHighlighted }) => {
    const commonInputClasses = `w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${isHighlighted ? 'border-red-500 ring-red-500' : ''}`;

    const handleChange = (e) => {
        const { type, checked, value, files } = e.target;
        if (type === 'checkbox') {
            onChange(field.key, checked);
        } else if (type === 'file') {
            onChange(field.key, files[0] ? files[0].path : '');
        } else {
            onChange(field.key, value);
        }
    };

    switch (field.type) {
        case 'toggle':
            // This now renders the structure for our CSS switch
            return (
                <label className="switch">
                    <input type="checkbox" checked={!!value} onChange={handleChange} />
                    <span className="slider round"></span>
                </label>
            );
        
        case 'select':
            return (
                <select value={value || ''} onChange={handleChange} className={commonInputClasses}>
                    {field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            );
        
        case 'textarea':
            return <textarea value={value || ''} onChange={handleChange} className={commonInputClasses} rows="4" placeholder={field.placeholder}></textarea>;

        case 'range':
            return (
                <div className="flex items-center space-x-3">
                    <input type="range" value={value || ''} min={field.min} max={field.max} step={field.step} onChange={handleChange} className="w-full" />
                    <span className="text-gray-400 font-mono">{value}</span>
                </div>
            );

        case 'radio':
            return (
                <div className="flex flex-wrap gap-x-4 gap-y-2">
                    {field.options?.map(opt => (
                        <label key={opt.value} className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name={field.key} value={opt.value} checked={value === opt.value} onChange={handleChange} className="h-4 w-4 text-indigo-600 bg-gray-800 border-gray-600 focus:ring-indigo-500"/>
                            <span className="text-gray-300">{opt.label}</span>
                        </label>
                    ))}
                </div>
            );

        case 'file':
            return (
                <div className="flex items-center">
                    <input type="text" readOnly value={value || ''} className={`${commonInputClasses} rounded-r-none`} placeholder="No file selected..."/>
                    <button type="button" onClick={() => alert('File picker not implemented yet.')} className="px-4 py-2 bg-indigo-600 rounded-r-md hover:bg-indigo-700 whitespace-nowrap">Browse...</button>
                </div>
            )

        default: // text, password, email, number, color, date
            return <input type={field.type} value={value || ''} onChange={handleChange} className={commonInputClasses} placeholder={field.placeholder} />;
    }
};

export default FormInput;