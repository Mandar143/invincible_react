import pool from '../../database/database-connection';
import { ResultSetHeader } from '../../shared/models/ResultSetHeader.model';
import { SpResponse } from '../../shared/models/SpResponse';
export default class CronRepository {

    async optOutMobile(){
        try {
               let result = await pool.query(`SELECT first_name,last_name,mobile_number,email_address FROM crocs_loyalty_engine.customer_loyalty WHERE DATE(created_at) = DATE(NOW() - INTERVAL 1 DAY) AND mobile_verified = 1 AND opt_out_from_sms_status = 0`);
               return { optOutMobile:result};
        } catch (error) {
            throw error;
        }
    }

    async optOutEmail(){
        try {
               let result = await pool.query(`SELECT first_name,last_name,mobile_number,email_address FROM crocs_loyalty_engine.customer_loyalty WHERE DATE(created_at) = DATE(NOW() - INTERVAL 1 DAY) AND email_verified = 1 AND opt_out_from_email_status = 0`);
               return { optOutEmail:result};
        } catch (error) {
            throw error;
        }
    }


}