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
