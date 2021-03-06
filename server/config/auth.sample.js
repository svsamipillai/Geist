const env = process.env.NODE_ENV;

const auth = {
    oauth: {
        twitter: {
            key: "",
            secret: "",
            callbackUrl: "/auth/signup/twitter/callback",
        },
        github: {
            key: "",
            secret: "",
            callbackUrl: "/auth/signup/github/callback",
        },
        google: {
            key: "",
            secret: "",
            callbackUrl: "/auth/signup/google/callback/",
        },
        facebook: {
            key: "",
            secret: "",
            callbackUrl: "/auth/signup/facebook/callback/",
        },
    },
    "loginAttempts": {
        forIp: 50,
        forIpAndUser: 7,
        logExpiration: '20m'
    },
    "sendWelcomeMail": false,
    "bundleFileName": env === 'development' ? 'auth.bundle.js' : require('../../stats.json').assetsByChunkName.auth[0],
    "sendWelcomeMail": false,
    "authTemplate": 'auth.hbs',
    "appUrl": '/app',
    "mainRoute": "auth",
    "companyName": "Bryan Haakman",
    "projectName": "Geist",
    "version": "0.1",
    "systemEmail": "noreply@geistmap.com",
    "supportEmail": "support@geistmap.com",
    "cryptoKey": "TODO change",
    "requireAccountVerification": false,
    "termsOfServiceUrl": null,
    "privacyPolicyUrl": null,
    "smtp": {
        from: {
            name: process.env.SMTP_FROM_NAME || 'Geist team',
            address: process.env.SMTP_FROM_ADDRESS || 'noreply@geistmap.com'
        },
        credentials: {
            user: process.env.SMTP_USERNAME || 'user',
            password: process.env.SMTP_PASSWORD || 'password',
            host: process.env.SMTP_HOST || '192.168.1.1',
            ssl: false,
            tls: true,
            port: 25,
        }
    },
}

module.exports = auth
