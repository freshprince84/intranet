markdown
# Frontend-Setup

1. Erstelle `src/components/Sidebar.js`:
jsx
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


2. Passe src/App.js an:
jsx
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
