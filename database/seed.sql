INSERT INTO users (username, email, password) VALUES ('admin', 'admin@example.com', '$2b$10$examplehashedpassword');
INSERT INTO roles (name) VALUES ('Admin');
INSERT INTO users_roles (user_id, role_id) VALUES (1, 1);
INSERT INTO tasks (title, description, status, created_by) VALUES ('Beispiel Task', 'Testaufgabe', 'open', 1);
INSERT INTO requests (title, description, status, created_by) VALUES ('Beispiel Request', 'Testanfrage', 'approval', 1);
