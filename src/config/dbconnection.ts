/* import Config from './config';
import Constants from './constants';

var mysql = require('mysql2');
    var port = process.env.PORT || 8081;

if (port === 8081) {

    var connection = mysql.createPool({
        host:  Constants.host,
        port: Constants.port,
        user: Constants.user,
        password: Constants.pass,
        database: Constants.database,
        waitForConnections: true,
        connectionLimit: 10,
        insecureAuth: true,
        queueLimit: 0
    });
} else {

   //same as above, with live server details
}


module.exports = connection; */
