var should = require('chai').should();

var ws = require('ws');
var serverHandler = require('../index').ServerHandler;
var clientHandler = require('../index').ClientHandler;

const PORT = 1531;

describe('IonNet Server', function() {
    describe('ServerHandler Initialization', function() {
        it('should instantiate and report when ready', function(done) {
            let server = new serverHandler(new ws.Server({port: PORT}));
            server.onReady(function() {
                server.ws.close();
                done();
            });
        });

        it('should detect when a client connects', function(done) {
            let server = new serverHandler(new ws.Server({port: PORT}));
            server.onConnection(function() {
                server.ws.close();
                done();
            });

            let client = new clientHandler(new ws('ws://localhost:'+PORT));
        });
    });

    // describe('ServerHandler RPC calls', function() {

    // });
});

describe('IonNet Client', function() {
    describe('ClientHandler Initialization', function() {
        it('should instantiate and report when handshake finalized', function(done) {
            let server = new serverHandler(new ws.Server({port: PORT}));

            let client = new clientHandler(new ws('ws://localhost:'+PORT));
            client.onReady(function() {
                server.ws.close();
                client.ws.close();
                done();
            });
        });
    });
});