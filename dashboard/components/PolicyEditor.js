import React, { useState } from 'react';

const PolicyEditor = ({ onUpdate }) => {
    const [name, setName] = useState('');
    const [rule, setRule] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/policies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, rule }),
            });
            if (response.ok) {
                setName('');
                setRule('');
                onUpdate(); // Refresh policies
            } else {
                console.error('Failed to create policy');
            }
        } catch (err) {
            console.error('Error submitting policy:', err);
        }
    };

    return (
        <form className="policy-editor" onSubmit={handleSubmit}>
            <h3>Add New Policy</h3>
            <input
                type="text"
                placeholder="Policy Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
            />
            <input
                type="text"
                placeholder="Policy Rule (Regex)"
                value={rule}
                onChange={(e) => setRule(e.target.value)}
                required
            />
            <button type="submit">Add Policy</button>
        </form>
    );
};

export default PolicyEditor;