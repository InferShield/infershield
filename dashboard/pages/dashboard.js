import React from 'react';
import ActivityFeed from '../components/ActivityFeed';
import AlertsList from '../components/AlertsList';

const Dashboard = () => {
    return (
        <div className="dashboard-container">
            <h1>Agentic Firewall Dashboard</h1>
            <div className="status-overview">
                <h2>Security Status: All Systems Operational</h2>
            </div>
            <div className="dashboard-sections">
                <div className="activity-feed-section">
                    <ActivityFeed />
                </div>
                <div className="alerts-section">
                    <AlertsList />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;