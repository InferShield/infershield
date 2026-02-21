import React, { useState, useEffect } from 'react';
import PolicyEditor from '../components/PolicyEditor';

const PoliciesPage = () => {
    const [policies, setPolicies] = useState([]);

    const fetchPolicies = () => {
        fetch('/api/policies')
            .then(res => res.json())
            .then(data => setPolicies(data))
            .catch(err => console.error('Error fetching policies:', err));
    };

    useEffect(() => {
        fetchPolicies();
    }, []);

    return (
        <div className="policies-page">
            <h1>Policy Management</h1>
            <PolicyEditor onUpdate={fetchPolicies} />
            <h3>Existing Policies:</h3>
            <ul>
                {policies.map(policy => (
                    <li key={policy.id}>
                        <p><strong>{policy.name}</strong>: {policy.rule}</p>
                        <p><em>Created: {new Date(policy.created_at).toLocaleString()}</em></p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PoliciesPage;