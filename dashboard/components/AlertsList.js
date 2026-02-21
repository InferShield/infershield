import React, { useEffect, useState } from 'react';

const AlertsList = () => {
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        // Dummy alerts for demonstration purposes
        const dummyAlerts = [
            { id: 1, message: 'Suspicious prompt detected.', time: new Date().toLocaleTimeString() },
            { id: 2, message: 'Policy violation: PII keywords found.', time: new Date().toLocaleTimeString() },
        ];
        setAlerts(dummyAlerts);
    }, []);

    return (
        <div className="alerts-list">
            <h3>Recent Alerts</h3>
            <ul>
                {alerts.map(alert => (
                    <li key={alert.id}>
                        <p>{alert.message}</p>
                        <p><em>{alert.time}</em></p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default AlertsList;