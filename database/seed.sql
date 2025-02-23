-- Benutzer
INSERT INTO users (username, first_name, last_name, birthday, id_type, id_number, id_expires, bank, bank_account_number, bank_account_type, contract_type, active_from, active_to, salary) 
VALUES ('pat', 'Patrick', 'Ammann', '2019-02-02', 'Cedula de extranjeria', '4909137', '2034-02-24', 'BANCO CAJA SOCIAL', '234523452345', 'Ahorros', 'Part Time 21d', '2022-04-28', '2099-04-22', 13000000);

-- Niederlassungen
INSERT INTO branches (name) VALUES ('Manila'), ('Parque Poblado'), ('Alianza Paisa'), ('Nowhere');

-- Rollen
INSERT INTO roles (name) VALUES ('Admin'), ('Cleaning'), ('Reception'), ('Restaurant'), ('Bar'), ('Promotion'), ('IT'), ('Contabilidad'), ('Derecho'), ('Hamburger');

-- Benutzer-Rollen (Pat hat Cleaning und Admin, Admin als zuletzt verwendet)
INSERT INTO users_roles (user_id, role_id, last_used) VALUES (1, 2, TRUE), (1, 1, FALSE); -- Pat (ID 1) hat Cleaning (ID 2) und Admin (ID 1)

-- Benutzer-Niederlassungen (Pat arbeitet in Manila und Parque Poblado)
INSERT INTO users_branches (user_id, branch_id) VALUES (1, 1), (1, 2); -- Manila (ID 1), Parque Poblado (ID 2)

-- Tasks
INSERT INTO tasks (title, description, status, responsible_user_id, quality_control_user_id, branch_id, due_date, created_by) 
VALUES ('Beispiel Task', 'Testaufgabe', 'open', 1, 1, 2, '2025-03-02', 1);

-- Requests
INSERT INTO requests (title, description, status, requested_by, responsible_user_id, branch_id, due_date, create_todo) 
VALUES ('Beispiel Request', 'Testanfrage', 'approval', 1, 1, 2, '2025-03-02', FALSE);

-- Berechtigungen (Beispiel: Cleaning kann Dashboard lesen, Admin kann alles)
INSERT INTO permissions (role_id, page, permission) VALUES 
(2, 'Dashboard', 'read'), -- Cleaning kann Dashboard lesen
(2, 'Worktracker', 'none'), -- Cleaning sieht Worktracker nicht
(2, 'Reports', 'none'), -- Cleaning sieht Reports nicht
(2, 'Settings', 'none'), -- Cleaning sieht Settings nicht
(1, 'Dashboard', 'both'), -- Admin kann alles
(1, 'Worktracker', 'both'),
(1, 'Reports', 'both'),
(1, 'Settings', 'both');
