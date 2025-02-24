-- Benutze die Datenbank
\c intranet;

-- Füge Beispiel-Rollen hinzu
INSERT INTO roles (name, description) VALUES
    ('Admin', 'Administrator mit vollen Berechtigungen'),
    ('Manager', 'Führungskraft mit erweiterten Berechtigungen'),
    ('Employee', 'Standardbenutzer');

-- Füge Beispiel-Niederlassungen hinzu
INSERT INTO branches (name, address) VALUES
    ('Parque Poblado', 'Carrera 43A #16A Sur-38, Medellín, Kolumbien'),
    ('Manila', 'Bonifacio Global City, Taguig, Metro Manila, Philippinen');

-- Füge Beispiel-Benutzer hinzu (Passwort: "test123" - in Produktion sichere Passwörter verwenden!)
INSERT INTO users (username, email, password_hash, first_name, last_name, birth_date, bank_name, bank_account) VALUES
    ('pat', 'pat@example.com', '$2b$10$6jM7G6HXcBWqxA3DqcU9reRRmqPxJWJ1lQ9M9C7q.zL9K1qR6Y6Km', 'Pat', 'Admin', '1990-01-01', 'Sparkasse', 'DE123456789'),
    ('max', 'max@example.com', '$2b$10$6jM7G6HXcBWqxA3DqcU9reRRmqPxJWJ1lQ9M9C7q.zL9K1qR6Y6Km', 'Max', 'Manager', '1992-02-02', 'Deutsche Bank', 'DE987654321');

-- Verknüpfe Benutzer mit Rollen
INSERT INTO users_roles (user_id, role_id, last_used) VALUES
    (1, 1, true),  -- Pat ist Admin
    (2, 2, true);  -- Max ist Manager

-- Verknüpfe Benutzer mit Niederlassungen
INSERT INTO users_branches (user_id, branch_id) VALUES
    (1, 1),  -- Pat arbeitet in Parque Poblado
    (2, 2);  -- Max arbeitet in Manila

-- Füge Beispiel-Berechtigungen hinzu
INSERT INTO permissions (role_id, page, access_level) VALUES
    -- Admin Berechtigungen
    (1, 'dashboard', 'both'),
    (1, 'worktracker', 'both'),
    (1, 'reports', 'both'),
    (1, 'settings', 'both'),
    -- Manager Berechtigungen
    (2, 'dashboard', 'both'),
    (2, 'worktracker', 'both'),
    (2, 'reports', 'read'),
    (2, 'settings', 'read'),
    -- Mitarbeiter Berechtigungen
    (3, 'dashboard', 'read'),
    (3, 'worktracker', 'write'),
    (3, 'reports', 'read'),
    (3, 'settings', 'none');

-- Füge Beispiel-Tasks hinzu
INSERT INTO tasks (title, description, status, responsible_id, quality_control_id, branch_id, due_date) VALUES
    ('Website-Update', 'Aktualisierung der Unternehmenswebsite', 'in_progress', 1, 2, 1, '2025-03-15'),
    ('Schulung durchführen', 'Neue Mitarbeiter einweisen', 'open', 2, 1, 2, '2025-03-20');

-- Füge Beispiel-Requests hinzu
INSERT INTO requests (title, description, status, requested_by_id, responsible_id, branch_id, due_date, create_todo) VALUES
    ('Urlaub beantragen', 'Urlaub vom 01.04.2025 bis 15.04.2025', 'approval', 2, 1, 2, '2025-03-10', false),
    ('Neuer Laptop', 'Antrag auf neue Hardware', 'approved', 1, 2, 1, '2025-03-05', true);

-- Füge Beispiel-Einstellungen hinzu
INSERT INTO settings (user_id, setting_key, setting_value) VALUES
    (1, 'theme', 'dark'),
    (1, 'language', 'de'),
    (2, 'theme', 'light'),
    (2, 'language', 'en');
