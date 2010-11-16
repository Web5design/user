/**
 * @fileoverview
 *
 * User handling. Work in progress. Much of this code is inspired by or copied
 * from express' authentication example.
 *
 * TODO: Move set up of cookie decoder and session from server.js to here.
 *
 * Example usage:
 *
 * user = require(user);
 * if (user.permission(req, 'manage content')) {
 *   // Do restricted stuff.
 * }
 */

var crypto = require('crypto');

// List of allowed users.
// To generate password:
// 1. Generate random salt (can be 'foo', better take sth better)
// 2. use md5 function in user to generate password:
//    - md5('cleartextpw' + 'salt')
// 3. add new user with key = name, name, salt and password.
var users = {
    admin: {
        name: 'admin',
        salt: 'qbtNjBqo34N2UkvpgtEMFwAA',
        password: 'd85fe0eb722a058557b48a643434f691'
    }
};

/**
 * User constructor.
 */
var User = function(name) {
    this.name = users[name].name || '';
    this.salt = users[name].salt || '';
    this.password = users[name].password || '';
    this.authenticated = false;
};

/**
 * Determine whether a user has a particular permission.
 *
 * In most cases, using the function permission(req, permission) will be more
 * convenient as it does not require to test for the presence of a user on the
 * session object.
 *
 * TODO Implement permission handling.
 */
User.prototype.permission = function(permission) {
    if (this.authenticated) {
        return true;
    }
    return false;
}

/**
 * Generates an md5 hash of a given string.
 */
var md5 = function(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Authenticates a user.
 *
 * @param name
 *   The user's name.
 * @param password
 *   The user's password.
 * @param request
 *   An HTTP request object.
 * @param callback
 *   Callback invoked after authentication. Receives an error object and a
 *   user object. The error contains a property 'param' indicating the
 *   parameter that caused the error ('name' or 'password');
 */
var authenticate = function(name, password, request, callback) {
    var user = users[name] ? new User(name) : {};
    if (user.name) {
        if (md5(password + user.salt) == user.password) {
            request.session.regenerate(function() {
                user.authenticated = true;
                request.session.user = user;
                callback();
            });
        }
        else {
            var e = new Error('Wrong password');
            e.param = 'password';
            callback(e);
        }
    }
    else {
        var e = new Error('Unknown user');
        e.param = 'name';
        callback(e);
    }
};

/**
 * Checks whether current user has given permission.
 *
 * @param req
 *   A request object.
 * @param permission
 *   A string that identifies a specific permission.
 *
 * @return
 *   true if the current user has the given permission, false otherwise.
 */
var permission = function(req, permission) {
    if (req.session.user && req.session.user.permission(permission)) {
        return true;
    }
    return false;
};

/**
 * Export as Common.js module.
 */
exports = {
    'authenticate': authenticate,
    'permission': permission,
    'request_handlers': require('./user.request_handlers').request_handlers
};