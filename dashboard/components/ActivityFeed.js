import React, { useEffect, useState } from 'react';

const ActivityFeed = () => {
    const [activities, setActivities] = useState([]);

    useEffect(() => {
        // Fetch activity feed data from the backend
        fetch('/api/logs')
            .then(response => response.json())
            .then(data => setActivities(data))
            .catch(error => console.error('Error fetching activity feed:', error));
    }, []);

    return (
        <div className="activity-feed">
            <h3>Real-Time Activity Feed</h3>
            <ul>
                {activities.map(activity => (
                    <li key={activity.id}>
                        <p><strong>Prompt:</strong> {activity.prompt}</p>
                        <p><strong>Response:</strong> {activity.response}</p>
                        <p><em>{new Date(activity.created_at).toLocaleString()}</em></p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ActivityFeed;