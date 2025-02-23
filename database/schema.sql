-- Tabelle: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    birthday DATE NOT NULL,
    id_type VARCHAR(50) NOT NULL,
    id_number VARCHAR(20) UNIQUE NOT NULL,
    id_expires DATE NOT NULL,
    bank VARCHAR(50) NOT NULL,
    bank_account_number VARCHAR(20) UNIQUE NOT NULL,
    bank_account_type VARCHAR(20) NOT NULL,
    contract_type VARCHAR(50) NOT NULL,
    active_from DATE NOT NULL,
    active_to DATE NOT NULL,
    salary DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabelle: roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Tabelle: users_roles
CREATE TABLE users_roles (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    last_used BOOLEAN DEFAULT FALSE, -- Markiert die zuletzt verwendete Rolle
    PRIMARY KEY (user_id, role_id)
);

-- Tabelle: branches
CREATE TABLE branches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL
);

-- Tabelle: users_branches (viele-zu-viele-Beziehung)
CREATE TABLE users_branches (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    branch_id INT REFERENCES branches(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, branch_id)
);

-- Tabelle: work_times
CREATE TABLE work_times (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabelle: tasks
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- open, in_progress, improval, quality_control, done
    responsible_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    quality_control_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
    due_date DATE,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabelle: requests
CREATE TABLE requests (
    id SERIAL PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'approval', -- approval, approved, to_improve, denied
    requested_by INT REFERENCES users(id) ON DELETE SET NULL,
    responsible_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    branch_id INT REFERENCES branches(id) ON DELETE SET NULL,
    due_date DATE,
    create_todo BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabelle: settings
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    company_logo VARCHAR(255),
    user_id INT REFERENCES users(id) ON DELETE CASCADE
);

-- Tabelle: permissions
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    role_id INT REFERENCES roles(id) ON DELETE CASCADE,
    page VARCHAR(50) NOT NULL, -- z. B. Dashboard, Worktracker, Reports, Settings
    permission VARCHAR(10) NOT NULL CHECK (permission IN ('read', 'write', 'both', 'none')) -- Berechtigungen
);
