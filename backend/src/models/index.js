const User = require('./User');
const Branch = require('./Branch');
const Request = require('./Request');
const Task = require('./Task');

// User-Request Beziehungen
User.hasMany(Request, { 
    as: 'requestsCreated',
    foreignKey: 'requested_by_id'
});

User.hasMany(Request, { 
    as: 'requestsResponsible',
    foreignKey: 'responsible_id'
});

Request.belongsTo(User, { 
    as: 'requestedBy',
    foreignKey: 'requested_by_id'
});

Request.belongsTo(User, { 
    as: 'responsible',
    foreignKey: 'responsible_id'
});

// Branch-Request Beziehungen
Branch.hasMany(Request, {
    foreignKey: 'branch_id'
});

Request.belongsTo(Branch, {
    foreignKey: 'branch_id'
});

// Task-Beziehungen
User.hasMany(Task, {
    as: 'responsibleTasks',
    foreignKey: 'responsible_id'
});

User.hasMany(Task, {
    as: 'qualityControlTasks',
    foreignKey: 'quality_control_id'
});

Task.belongsTo(User, {
    as: 'responsible',
    foreignKey: 'responsible_id'
});

Task.belongsTo(User, {
    as: 'qualityControl',
    foreignKey: 'quality_control_id'
});

Task.belongsTo(Branch, {
    foreignKey: 'branch_id'
});

Branch.hasMany(Task, {
    foreignKey: 'branch_id'
});

Request.hasMany(Task, {
    foreignKey: 'request_id'
});

Task.belongsTo(Request, {
    foreignKey: 'request_id'
});

module.exports = {
    User,
    Branch,
    Request,
    Task
}; 