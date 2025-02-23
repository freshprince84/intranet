INSERT INTO users (username, email, password) VALUES ('admin', 'admin@example.com', '$2b$10$examplehashedpassword');
INSERT INTO roles (name) VALUES ('Admin');
INSERT INTO users_roles (user_id, role_id) VALUES (1, 1);
