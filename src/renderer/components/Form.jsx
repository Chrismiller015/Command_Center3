import React from 'react';
import FormInput from './FormInput';

const Form = ({ schema, formData, onFormChange, highlightedFields = {} }) => {
    return (
        <div className="space-y-4">
            {schema.filter(field => field.type !== 'hidden').map((field) => (
                <div key={field.key}>
                    <label htmlFor={field.key} className="block text-sm font-medium text-gray-300 mb-2">
                        {field.label}
                    </label>
                    <FormInput
                        field={field}
                        value={formData[field.key]}
                        onChange={onFormChange}
                        isHighlighted={highlightedFields[field.key]}
                    />
                </div>
            ))}
        </div>
    );
};

export default Form;