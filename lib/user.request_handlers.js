
/**
 * Register request handlers for user.
 */
exports.request_handlers = function(app) {
    var user = require('./user'),
        forms = require('forms');

    /**
     * Removes Set-Cookie header from response if user is not authenticated.
     *
     * Suppress Set-Cookie on all pages but the login page when a user is not
     * authenticated. This allows for aggressive caching with reverse-proxies.
     * Due to connect's session.js setting headers very late, we have no other
     * choice than using regex to remove Set-Cookie.
     *
     * @see sessionSetup() in session.js.
     *
     * Related issue: https://github.com/senchalabs/connect/issues/issue/153
     */
    app.use(function(req, res, next) {
        if (!req.session.user && req.url != '/login') {
            var writeHead = res.writeHead;
            res.writeHead = function(status, headers) {
                res.writeHead = writeHead;
                var result = res.writeHead(status, headers);
                // Ouch.
                delete headers['Set-Cookie'];
                res._header = res._header.replace(/^Set-Cookie:.*?\r\n(.*)$/im, '$1');
                return result;
            };
        }
        next();
    });

    /**
     * Handles get requests for login form
     */
    app.get('/login', function(req, res, next) {
        login_form_def(req, res, next);
    });

    /**
     * Handles post requests for login form
     */
    app.post('/login', function(req, res, next) {
        login_form_def(req, res, next);
    });

    /**
     * Defines login form and hands it off to form handler.
     */
    function login_form_def(req, res, next) {
        var form = new forms.Form({
            fields: function() {
                var field_def = {};

                field_def['name'] = forms.fields.string({
                    label: 'Name',
                    required: true,
                    widget: forms.widgets.text({classes: ['text']})
                });
                field_def['password'] = forms.fields.password({
                    label: 'Password',
                    required: true,
                    widget: forms.widgets.password({classes: ['text password']})
                });
                field_def['login'] = forms.fields.submit({
                    value: 'Login',
                    submit: function(form, req, res) {
                        for (var k in form.def.fields) {
                            if (k == 'name') {
                                name = form.def.fields[k].value;
                            }
                            else if (k == 'password') {
                                password = form.def.fields[k].value;
                            }
                        }
                        user.authenticate(name, password, req, function(err) {
                            if (err) {
                                form.def.fields[err.param].error = err.message;
                                res.render('content', {
                                    locals: {
                                        pageTitle: 'Login',
                                        title: 'Login',
                                        content: form.toHTML()
                                    }
                                });
                            }
                            else {
                                res.redirect('/user');
                            }
                        });
                    }
                });
                return field_def;
            },
            render: function(form, req, res) {
                res.render('content', {
                    locals: {
                        pageTitle: 'Login',
                        title: 'Login',
                        content: form.toHTML()
                    }
                });
            }
        });
        // Delegate request handling to form.
        form.handle(req, res, next);
    };

    /**
     * Sign out a user.
     */
    app.get('/logout', function(req, res, next) {
        // Destroy the user's session to log them out -
        // will be re-created on next request.
        if (req.session.user) {
            var user = req.session.user;
            req.session.destroy(function(){
                console.log('Logged out ' + user.name);
                res.redirect('/login');
            });
        }
        else {
            next();
        }
    });

    /**
     * View a user.
     *
     * @todo Stop using the content.hbs template.
     */
    app.get('/user', function(req, res, next) {
        if (req.session.user) {
            res.render('content', {locals: {
                pageTitle: req.session.user.name,
                title: req.session.user.name,
                content: '<a href="/logout">Log out</a>'
            }});
        }
        else {
            res.redirect('/login');
        }
    });
}