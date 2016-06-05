'use strict';

var $npm = {
    utils: require('./utils'),
    events: require('./events')
};

function poolConnect(ctx, config) {
    return config.promise(function (resolve, reject) {
        config.pg.connect(ctx.cn, function (err, client, done) {
            if (err) {
                $npm.events.error(ctx.options, err, {
                    cn: $npm.utils.getSafeConnection(ctx.cn),
                    dc: ctx.dc
                });
                reject(err);
            } else {
                var end = client.end;
                client.end = function () {
                    throw new Error("Cannot invoke client.end() directly.");
                };
                resolve({
                    client: client,
                    done: function () {
                        client.end = end;
                        done();
                        $npm.events.disconnect(ctx, client);
                    }
                });
                $npm.events.connect(ctx, client);
            }
        });
    });
}

function directConnect(ctx, config) {
    return config.promise(function (resolve, reject) {
        var client = new config.pg.Client(ctx.cn);
        client.connect(function (err) {
            if (err) {
                $npm.events.error(ctx.options, err, {
                    cn: $npm.utils.getSafeConnection(ctx.cn),
                    dc: ctx.dc
                });
                reject(err);
            } else {
                var end = client.end;
                client.end = function () {
                    throw new Error("Cannot invoke client.end() directly.");
                };
                resolve({
                    client: client,
                    done: function () {
                        end.call(client);
                        $npm.events.disconnect(ctx, client);
                    }
                });
                $npm.events.connect(ctx, client);
            }
        });
    });
}

module.exports = function (config) {
    return {
        pool: function (ctx) {
            return poolConnect(ctx, config);
        },
        direct: function (ctx) {
            return directConnect(ctx, config);
        }
    };
};