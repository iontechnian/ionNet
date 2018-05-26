const crypto = require("crypto");

module.exports = {

    ecdh: null,
    publicKey: '',

    createKeys: function() {
        this.ecdh = crypto.createECDH('secp521r1');
        this.publicKey = this.ecdh.generateKeys('hex');
    },

    computeSecret: function(publicKey) {
        return this.ecdh.computeSecret(publicKey, 'hex', 'hex');
    },

    /**
     * Creates an object containing both cipher and decipher objects with helper methods to encrypt/decrypt messages
     * @param {string} publicKey ECDH public key from other peer
     * @param {string} iv cryptographically secure random string 
     */
    createCryptoObj: function(publicKey, iv) {
        let secret = this.computeSecret(publicKey).substr(0,32);
        var CryptObj = {
            secret: secret,
            iv: iv,

            encrypt: function(str) {
                return new Promise(resolve => {
                    let encrypted = '';

                    let cipher = crypto.createCipheriv('aes-256-cbc', this.secret, this.iv)

                    cipher.on('readable', () => {
                        const data = cipher.read();
                        if(data) encrypted += data.toString('hex');
                    });

                    cipher.on('end', () => {
                        resolve(encrypted);
                    });

                    cipher.write(str);
                    cipher.end();
                });
            },

            decrypt: function(str) {
                return new Promise(resolve => {
                    let decrypted = '';
    
                    let decipher = crypto.createDecipheriv('aes-256-cbc', this.secret, this.iv);
    
                    decipher.on('readable', () => {
                        const data = decipher.read();
                        if(data) decrypted += data.toString('utf8');
                    });
    
                    decipher.on('end', () => {
                        resolve(decrypted);
                    });
    
                    decipher.write(str, 'hex');
                    decipher.end();
                });
            }
        };

        return CryptObj;
    }
}