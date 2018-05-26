var msgCrypt = require('./msgCrypt');
msgCrypt.createKeys();

var IonNetClient = class IonNetClient {

    constructor(ws, isPeer = false) {
        this.enumMessageType = {
            UTIL: 0,
            SEND: 1,
            REPLY: 2,
            PUSH: 3,
            ERROR: 4
        };
        this.lastI = 0;
        this.handshake = false;
        this.waitingMessages = {};
        this.message = (msg) => {};
        this.ready = () => {};
        this.disconnect = () => {};

        this.ws = ws;

        //if client is not a peer: called when client connects to server
        if(!isPeer) {
            this.ws.on('open', function() {
                    this.startHandshake();
            }.bind(this));
        }

        this.ws.on('close', function() {
            this.disconnect();
        }.bind(this));

        this.ws.on('message', async msg => {
            if(this.handshake) {
                msg = JSON.parse(await this.cryptObj.decrypt(msg));
                // if(msg.o) msg.o = JSON.parse(msg.o);

                if(msg.t == this.enumMessageType.REPLY || (msg.t == this.enumMessageType.ERROR && msg.i != null)) {
                    this.waitingMessages[msg.i](msg);
                } else {
                    this.message(msg);
                }
            } else {
                if(msg.startsWith('handshake')) {
                    msg = JSON.parse(msg.substring(9));

                    if(!msg.key || !msg.iv) return this.send({f:'handshake',t:4,e:4});

                    this.cryptObj = msgCrypt.createCryptoObj(msg.key, msg.iv);
                    this.handshake = true;
                    if(isPeer) {
                        this.startHandshake();
                    }
                    this.ready();
                } else {
                    this.startHandshake();
                }
            }
        });
    }

    onMessage(func) {
        this.message = func;
    }

    /**
     * Called when the handler has completed
     * the handshake and is ready to communicate
     */
    onReady(func) {
        this.ready = func;
    }

    onDisconnect(func) {
        this.disconnect = func;
    }

    startHandshake() {
        var handshakeObj = {
            key: msgCrypt.publicKey,
            iv: 'a2xhcgAAAAAAAAAA'
        };
        handshakeObj = 'handshake' + JSON.stringify(handshakeObj);
        this.ws.send(handshakeObj);
    }

    async send(func, obj) {
        return new Promise(async (resolve,reject) => {
            if(this.handshake) {
                let msgObj = {
                    i: this.lastI,
                    f: func,
                    t: this.enumMessageType.SEND,
                    o: obj
                };
                this.waitingMessages[this.lastI] = function(msg) {
                    resolve(msg);
                };
                ++this.lastI;
                this.ws.send(await this.cryptObj.encrypt(JSON.stringify(msgObj)));
            } else {
                reject('IonNetHandler not ready.')
            }
        })
    }

    async reply(func, i, obj) {
        return new Promise(async (resolve,reject) => {
            if(this.handshake) {
                let msgObj = {
                    i: i,
                    f: func,
                    t: this.enumMessageType.REPLY,
                    o: obj
                };
                this.ws.send(await this.cryptObj.encrypt(JSON.stringify(msgObj)));
            } else {
                reject('IonNetHandler not ready.')
            }
        })
    }

    async push(func, obj) {
        return new Promise(async (resolve,reject) => {
            if(this.handshake) {
                let msgObj = {
                    f: func,
                    t: this.enumMessageType.PUSH,
                    o: obj
                };
                this.ws.send(await this.cryptObj.encrypt(JSON.stringify(msgObj)));
            } else {
                reject('IonNetHandler not ready.')
            }
        })
    }

    async error(func, i, code = -1, obj = null) {
        return new Promise(async (resolve,reject) => {
            if(this.handshake) {
                let msgObj = {
                    i: i,
                    f: func,
                    t: this.enumMessageType.ERROR,
                    e: code
                };
                if(obj) {
                    msgObj.o = obj;
                }
                this.ws.send(await this.cryptObj.encrypt(JSON.stringify(msgObj)));
            } else {
                reject('IonNetHandler not ready.')
            }
        })
    }
};

var IonNetServer = class IonNetServer {

    constructor(ws) {

        this.connection = (peer) => {};
        this.ready = () => {};

        this.ws = ws;

        //called when server received client connection
        this.ws.on('connection', function(peer) {
            this.connection(new IonNetClient(peer, true));
        }.bind(this));

        this.ws.on('listening', function() {
            this.ready();
        }.bind(this))
    }

    onConnection(func) {
        this.connection = func;
    }

    onReady(func) {
        this.ready = func;
    }
};

module.exports = {
    createClientHandler: function(ws) {
        return handler = new IonNetClient(ws);
    },
    createHostHandler: function(ws) {
        return new IonNetServer(ws);
    },

    clientHandler: IonNetClient,
    serverHandler: IonNetServer
};