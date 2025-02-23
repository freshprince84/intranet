# Frontend-Setup

1. Erstelle `src/components/Sidebar.js`:
```jsx
import React from 'react';
import { useAuth } from '../hooks/useAuth'; // Hypothetischer Hook für Auth

const Sidebar = () => {
    const { user, permissions } = useAuth();

    const menuItems = [
        { name: 'Dashboard', path: '/' },
        { name: 'Worktracker', path: '/worktracker' },
        { name: 'Reports', path: '/reports' },
        { name: 'Settings', path: '/settings' }
    ].filter(item => 
        permissions[item.name.toLowerCase()] !== 'none'
    );

    return (
        <div className="w-64 h-screen bg-gray-800 text-white">
            <ul>
                {menuItems.map(item => (
                    <li key={item.name}><a href={item.path}>{item.name}</a></li>
                ))}
            </ul>
        </div>
    );
};

export default Sidebar;


2. Erstelle src/pages/Dashboard.js:

import React from 'react';

const Dashboard = () => {
    const tasks = [
        { id: 1, title: 'Beispiel Task', status: 'open', responsible: 'Pat', branch: 'Parque Poblado', dueDate: '2025-03-02' },
        { id: 2, title: 'Testaufgabe', status: 'in_progress', responsible: 'Pat', branch: 'Parque Poblado', dueDate: '2025-03-03' }
    ];

    const requests = [
        { id: 1, title: 'Beispiel Request', status: 'approval', requestedBy: 'Pat', responsible: 'Pat', branch: 'Parque Poblado', dueDate: '2025-03-02' },
        { id: 2, title: 'Testanfrage', status: 'approved', requestedBy: 'Pat', responsible: 'Pat', branch: 'Parque Poblado', dueDate: '2025-03-03' }
    ];

    return (
        <div className="p-4">
            <h1 className="text-2xl mb-4">Dashboard</h1>
            
            <h2 className="text-xl mb-2">Tasks</h2>
            <table className="w-full border-collapse mb-8">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border p-2">Titel</th>
                        <th className="border p-2">Status</th>
                        <th className="border p-2">Verantwortlicher</th>
                        <th className="border p-2">Niederlassung</th>
                        <th className="border p-2">Fälligkeit</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map(task => (
                        <tr key={task.id}>
                            <td className="border p-2">{task.title}</td>
                            <td className="border p-2">{task.status}</td>
                            <td className="border p-2">{task.responsible}</td>
                            <td className="border p-2">{task.branch}</td>
                            <td className="border p-2">{task.dueDate}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <h2 className="text-xl mb-2">Requests</h2>
            <table className="w-full border-collapse">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border p-2">Titel</th>
                        <th className="border p-2">Status</th>
                        <th className="border p-2">Angefragt von</th>
                        <th className="border p-2">Verantwortlicher</th>
                        <th className="border p-2">Niederlassung</th>
                        <th className="border p-2">Fälligkeit</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map(request => (
                        <tr key={request.id}>
                            <td className="border p-2">{request.title}</td>
                            <td className="border p-2">{request.status}</td>
                            <td className="border p-2">{request.requestedBy}</td>
                            <td className="border p-2">{request.responsible}</td>
                            <td className="border p-2">{request.branch}</td>
                            <td className="border p-2">{request.dueDate}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default Dashboard;


3.Passe src/App.js an:

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';

function App() {
    return (
        <Router>
            <div className="flex">
                <Sidebar />
                <div className="flex-1 p-4">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;


4. Erstelle src/hooks/useAuth.js (hypothetisch):

import { useState, useEffect } from 'react';
import axios from 'axios';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [permissions, setPermissions] = useState({});

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await axios.get('/api/auth/user');
                setUser(response.data.user);
                setPermissions(response.data.permissions);
            } catch (error) {
                console.error('Auth-Fehler:', error);
            }
        };
        fetchUser();
    }, []);

    return { user, permissions };
};
