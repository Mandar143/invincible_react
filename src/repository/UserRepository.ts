import pool from '../database/database-connection';
import { User } from '../model/User';
import { BaseRepository } from './BaseRepository';

export default class UserRepository implements BaseRepository<User> {
  findAll(callback: any): void {
    // TODO
  }

  findOneById(id: number, callback: any): void {
    pool.query('SELECT * FROM customer WHERE id = ?', [id]).then(
      (result: any) => callback(result[0])
    );
  }

  findOneByUsername(username: string) {
    return pool.query('SELECT id as user_id,contact,gender,merchant_id,sub_merchant_id,sub_merchant_location_id,username,password,email,first_name,last_name,status,user_type_id,created_by,avatar FROM admins WHERE username = ? and status=1', [username]).then(
      result => result[0]);
  }

  findOneByEmail(username: string, callback: any): void {
    pool.query('SELECT * FROM admins WHERE username = ?', [username]).then(
      (result: any) => callback(result[0])
    );
  }

  checkUsername(username: string, callback: any): void {
    pool.query('SELECT count(username) as deletedUser FROM admins WHERE username = ? and deleted_at is not null', [username]).then((result: any) => callback(null, result[0])).catch(error => callback(error));
  }

  checkCustomer(mobile_number: number, callback: any): void {
    pool.query(`SELECT CASE WHEN customer_loyalty.status = 0 THEN 'User profile is inactive, please contact site admin.' WHEN customer_loyalty.status = 2 THEN 'User profile is deleted, please contact site admin.' WHEN customer_loyalty.status = 3 THEN 'User profile is blocked, please contact site admin.' ELSE 'Unauthorised access' END AS status FROM customer_loyalty WHERE customer_loyalty.mobile_number = ? AND customer_loyalty.status != 1`, [mobile_number]).then((result: any) => callback(null, result[0])).catch(error => callback(error));
  }
  createOne(item: User, callback: any): void {
    pool.query('INSERT INTO customer ( username, password ) values (?,?)', [item.username, item.password]).then(
      (result: any) => callback({ user_id: result.insertId })
    );
  }

  updateOne(item: User): void {
    // TODO
  }

  deleteOne(id: number): void {
    // TODO
  }

  async loginLogs(id: number, callback: any) {
    let result = await pool.query('INSERT INTO login_logs ( user_id ) values (?)', [id]).then(
      (result: any) => callback({ loginLogId: result.insertId })
    );
    //console.log(result);
    //return result;

  }

}
