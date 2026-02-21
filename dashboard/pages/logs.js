import React, { useState, useEffect } from 'react';

const LogsPage = () => {
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetch('/api/logs')
            .then(res => res.json())
            .then(data => setLogs(data))
            .catch(err => console.error('Error fetching logs:', err));
    }, []);

    const filteredLogs = logs.filter(log =>
        log.prompt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.response.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="logs-page">
            <h1>Audit Trail Logs</h1>
            <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
            <ul>
                {filteredLogs.map(log => (
                    <li key={log.id}>
                        <p><strong>Prompt:</strong> {log.prompt}</p>
                        <p><strong>Response:</strong> {log.response}</p>
                        <p><em>{new Date(log.created_at).toLocaleString()}</em></p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default LogsPage;