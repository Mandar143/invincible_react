import * as mysql from 'mysql2';
import Constants from '../config/constants';
const util = require('util');
const pool = mysql.createPool({
    connectionLimit: Constants.database.connectionLimit,
    host: Constants.database.host,
    user: Constants.database.user,
    password: Constants.database.password,
    database: Constants.database.database,
    charset: 'utf8',
    waitForConnections: true,
    queueLimit: 30
});

// Ping database to check for common exception errors.
pool.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.error('Database connection was closed.');
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.error('Database has too many connections.');
        }
        if (err.code === 'ECONNREFUSED') {
            console.error('Database connection was refused.');
        }

        if (err.code === 'ETIMEDOUT') {
            console.error('Database connection timed out.');
        }
    }

    if (connection) connection.release();

    return;
})

/* pool.on('release', (connection) => {
    console.log('Connection %d released', connection.threadId);
}); */

pool.on('end', (err: any) => console.error(err));

// Promisify for Node.js async/await.
pool.query = util.promisify(pool.query);
export default pool;
