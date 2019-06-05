// setup config based on environment 
export default {
    // Development environment config 
    "dev": {
        "APP_PORT": process.env.APP_PORT || 8081,
        "MONGO_URI": "mongodb://localhost/ip_mean_db",
        "HOST_URI": "http://localhost:" + (process.env.APP_PORT || 8081) + "/",
        "AUTHORIZATION_KEY": "UFNST0dSQU1NRVIgU09GVENFTEwgQ1lPUiBISUVSQVJDSFkgVSVB",
        "REFRESH_INTERVAL": 30000,
        "EMAIL": {
            "HOST": "smtp.gmail.com",
            "SECURE": false,
            "PORT": "587",
            "USERNAME": "abc@gmail.com",
            "PASSWORD": "abc@123",
            "FROM": "abc@gmail.com",
            "TO": "abc@gmail.com"
        }
    },
    // Production environment config 
    "prod": {

    },
    // Pre-Production environment config 
    "preprod": {

    }
}