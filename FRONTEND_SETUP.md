# Frontend-Setup

1. Erstelle `src/components/Sidebar.js`:

import React from 'react';

const Sidebar = () => {
    return (
        <div className="w-64 h-screen bg-gray-800 text-white">
            <ul>
                <li>Dashboard</li>
                <li>Worktracker</li>
                <li>Reports</li>
            </ul>
        </div>
    );
};

export default Sidebar;


2. Erstelle src/pages/Dashboard.js:

import React from 'react';

const Dashboard = () => {
    const requests = [
        { id: 1, title: 'Beispiel Request', status: 'approval' },
        { id: 2, title: 'Testanfrage', status: 'approved' }
    ];

    return (
        <div className="p-4">
            <h1 className="text-2xl mb-4">Dashboard</h1>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border p-2">Titel</th>
                        <th className="border p-2">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map(request => (
                        <tr key={request.id}>
                            <td className="border p-2">{request.title}</td>
                            <td className="border p-2">{request.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Dashboard;



2. Passe src/App.js an:

import Sidebar from './components/Sidebar';

function App() {
    return (
        <div className="flex">
            <Sidebar />
            <div className="flex-1 p-4">Main Content</div>
        </div>
    );
}

export default App;
