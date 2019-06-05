/* import * as mysql from 'mysql2';
import Constants from '../config/constants';

export default class DatabaseService {
  pool: any = {};

  constructor(multipleStatement: boolean = false) {
    const connectionOptions = {
      connectionLimit: Constants.database.connectionLimit,
      host: Constants.database.host,
      user: Constants.database.user,
      password: Constants.database.password,
      database: Constants.database.database,
      charset: 'utf8',
      waitForConnections: true,
      queueLimit: 30
    }
    if (multipleStatement) {
      Object.assign(connectionOptions, { multipleStatements: true });
    }
    this.pool = mysql.createPool(connectionOptions);
    // this.connectionRelease();
  }

  getConnection = () => new Promise((resolve, reject) => {
    this.pool.getConnection((err: any, connection: any) => {
      if (err) {
        console.log(err)
        this.pool.releaseConnection(connection);
        reject(err);
      } else {
        //const results = connection.execute('select 1+1');
        connection.release();
        resolve(connection);
      }
    });
  });

  getConnection2 = () => {
    return this.pool;
  };

  query2 = (sql: string, values: any) => new Promise<{ error: any, response: any }>((resolve, reject) => {
    this.pool.query(sql, values, (err: any, results: any) => {
      if (err) {
        this.pool.end();
        console.log(`connection error---${err}`);
        return reject({ error: err });
      }
      return resolve({ error: null, response: results });
    });
  });

  query = (sql: string, values: any) => new Promise((resolve, reject) => {
    this.pool.getConnection((err: any, connection: any) => {
      if (err) {
        console.log(`main error---${err}`);
        if (connection) {
          connection.release();
          this.pool.releaseConnection(connection);
        }
        return reject(err);
      } else {
        connection.query(sql, values, (err: any, results: any) => {
          connection.release();
          if (err) {
            console.log(`connection error---${err}`);
            return reject(err);
          }
          return resolve(results);

        });

        connection.on('error', function (err) {
          connection.release();
          return reject(err);
        });
      }
    });
  });

  connectionRelease = () => {
    this.pool.on('release', (connection) => {
      console.log('Connection %d released', connection.threadId);
    });
    this.pool.on('end', (err: any) => console.error(err));

  }
  destroy = () => {
    this.pool.end((err: any) => console.error(err));
  }
}
 */