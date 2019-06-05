let distDirPath = './';
if (process.env.NODE_ENV == 'dev') {
    distDirPath += 'dist/';
}

export default {
    merchantId: 1,
    jwtTokenType: 'Bearer',
    pagination: {
        limit: 10
    },
    userProfileUploadPath: '/public/assets/uploads/',
    userProfileUploadActualPath: distDirPath + 'public/assets/uploads/',
    userProfileUploadedVirtualPath: 'public/userProfile/',
    webURL: "http://crocs.boomerup.com/login",
    termsLink: "http://crocs.boomerup.com/terms-and-conditions",
    //database connection details
    database: {
        host: 'boomer.c55jwccd5e2i.ap-south-1.rds.amazonaws.com',
        user: 'web',
        password: '7u8i9o0p',
        database: 'crocs_loyalty_engine',
        connectionLimit: 10,
        port: 3306,
        // connectionLimit: 10,
        /* host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'crocs_loyalty_engine', */
    },
    //sms gateway details
    sms: {
        url: '',
        username: '',
        password: '',
        from: '',
        drl_mask: ''
    },
    promoSMS: {
        url: '',
        username: '',
        password: '',
        from: '',
        drl_mask: ''
    },
    transSMS: {
        url: '',
        username: '',
        password: '',
        from: '',
        drl_mask: ''
    },
    promoEmail: {
        host: '',
        endpoint: '',
        port: 587,
        secure: false,
        user: "",
        pass: "",
        apiKey: '',
        publicApiKey: '',
        domain: '',
    },
    transEmail: {
        host: '',
        endpoint: '',
        port: 587,
        secure: false,
        user: "",
        pass: "",
        apiKey: '',
        publicApiKey: '',
        domain: '',
    },
    // transEmail: {
    //     host: 'email-smtp.us-west-2.amazonaws.com',        
    //     port: 587,
    //     secure: false,
    //     user: "AKIAT7PDDTL2HLUGSUVB",
    //     pass: "BDINmax3r1G+6bRXkKJ5F0noj6aSe1PTTG1jmQHpfyK6"        
    // },
    ftp1: {
        host: "ec2-13-233-148-110.ap-south-1.compute.amazonaws.com",
        user: "crocsftpuser",
        password: "PVus6F$19qX<"
    },
    ftp2: {
        host: "199.79.62.93",
        user: "boomegmr",
        password: "gite0K$9#h"
    }
}
