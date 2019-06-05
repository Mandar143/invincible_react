import pool from '../database/database-connection';
import { item } from "../model/Menus";
import { DataTableQueryParam } from "../shared/models/dataTablequeryParams.model";
import { ResultSetHeader } from "../shared/models/ResultSetHeader.model";
import { SpResponse } from "../shared/models/SpResponse";


export default class SharedRepository {

    callUserStatusProdure(req) {
        const mobile_number = req.mobile_number;
        return pool.query(`CALL checkUserStatus(?, @firstName, @lastName, @emailAddress, @dateOfBirth, @anniversaryDate, @spouseDob,  @maritalStatus, @userGender, @userStatus, @status, @message, @statusCode);`, [mobile_number]).then((result: ResultSetHeader) => result);;
    }

    async checkUserStatus(req) {
        try {
            const procedureResult = await this.callUserStatusProdure(req);
            // console.log('procedureResult', procedureResult);

            /* if (procedureResult.affectedRows !== 1) {
                throw new Error('Failed to fecth');
                return;
            } */

            const selectResutArray = await pool.query(`SELECT @firstName as first_name, @lastName as last_name, @emailAddress as email_address, @dateOfBirth as date_of_birth, @anniversaryDate as anniversary_date, @spouseDob as spouse_dob,  @maritalStatus as marital_status, @userGender as gender, @userStatus as user_status, @status as status, @message as message, @statusCode as statusCode;`, null);

            if (Object.keys(selectResutArray).length < 1) {
                throw new Error('Failed to select');
                return;
            }
            //collect result
            const selectResut = selectResutArray[0];
            const allowStatusCode = [104, 200];

            if (!selectResut['statusCode'] || 'statusCode' in selectResut && allowStatusCode.indexOf(selectResut['statusCode']) == -1) {
                // console.log('selectResut not found');
                const requiredKey = ['status', 'message', 'statusCode'];
                const response = this.filter(selectResut, ...requiredKey);
                return { error: response };
            }

            if (selectResut['statusCode'] == 104) {
                return { error: null, result: null };
            }

            const requiredKey = ['first_name', 'last_name', 'email_address', 'date_of_birth', 'anniversary_date', 'spouse_dob', 'marital_status', 'gender', 'user_status'];
            const response = this.filter(selectResut, ...requiredKey);
            return { error: null, result: response };
        } catch (err) {
            throw err;
        }
    }

    filter(object: {}, ...keys) {
        return keys.reduce((result, key) => ({ ...result, [key]: object[key] }), {});
    };

    async sendOtp(req, callback) {
        try {
            const inputs = JSON.stringify({
                merchant_id: 1,
                platForm: 2,
                otp_generated_for: 201,
                request_for: 'SENDOTP',
                ...req.body
            });

            const otpResultArray = await pool.query(`CALL verifyOTP (?);`, [inputs]).then((result: ResultSetHeader) => result);

            if (Object.keys(otpResultArray).length < 2) {
                return callback({ message: 'Procedure Error' });
            }

            const otpResult = <SpResponse>otpResultArray[0][0]['response'];

            if (!otpResult.statusCode || otpResult.statusCode === 520) {
                return callback({ message: 'Somting Went Wrong', ...otpResult });
            }

            const requiredKey = ['currentOTP', 'otpAttempt'];
            const response = this.filter(otpResult.data, ...requiredKey);;
            delete otpResult.data;
            return callback(null, { ...otpResult, ...response });
        } catch (err) {
            return callback(err);
        }

    }

    async reSendOtp(req, callback) {
        const mobile_number = req.mobile_number;
        try {

            const otpResultArray = await pool.query(`CALL verifyOTP (?,null,2,201,'RESENDOTP');`, [mobile_number]);

            if (Object.keys(otpResultArray).length < 1) {
                return callback({ message: 'Otp not insert' });
            }
            const otpResult = otpResultArray[0][0];
            if (!otpResult['statusCode'] || 'statusCode' in otpResult && otpResult['statusCode'] == '520') {
                return callback({ message: 'Somting Went Wrong', ...otpResult });
            }
            const requiredKey = ['currentOTP', 'status', 'message', 'otpAttempt', 'statusCode'];
            const response = this.filter(otpResult, ...requiredKey);;
            return callback(null, response);

        } catch (error) {
            return callback(error);
        }
    }

    getOtp(req, callback) {
        const mobile_number = req.mobile_number;
        pool.query(`SELECT otp FROM customer_otp WHERE mobile_number='${mobile_number}' and otp_expired=0 and otp_used=0 order by created_at desc limit 1`, callback).then(
            (result: any) => {
                callback(result[0])
            }
        );
    }

    async getOtpTemplate(req) {
        const name = req.name;
        try {
            let result = await pool.query(`SELECT title,message FROM sms_templates where name = ?; `, [name]);
            return { templateData: result };
        } catch (error) {
            throw error;
        }

    }
    async getEmailTemplate(req) {
        const name = req.name;
        try {
            let result = await pool.query(`SELECT description,email_to,email_cc,email_bcc,email_from,subject,text1 FROM system_emails where name = ?; `, [name]);
            return { emailTemplateData: result };
        } catch (error) {
            throw error;
        }

    }
    async getStaticPage(req) {
        const page_name = req.page_name;
        try {
            let result = await pool.query(`SELECT page_url,slug,page_desc,browser_title,meta_keywords,meta_description,page_content,status FROM crocs_loyalty_engine.site_pages where page_name=? `, [page_name]);
            return result[0];
        } catch (error) {
            throw error;
        }
    }
    async optOut(req) {
        const mobile_number = req.mobile_number;
        const email_address = req.email_address;
        const type = req.type;
        try {
            if (type === 1) {
                let result = await pool.query(`UPDATE customer_loyalty SET opt_out_from_sms_status = 1 WHERE mobile_number =?`, [mobile_number]);
                if (result.affectedRows > 0) {
                    let selectRows = await pool.query(`SELECT first_name,last_name,mobile_number,email_address FROM customer_loyalty WHERE email_address =?`, [email_address]);
                    return { optOutMobileUpdate: selectRows };
                }
                return { optOutMobileUpdate: '' };
            }
            else {
                let result = await pool.query(`UPDATE customer_loyalty SET opt_out_from_email_status = 1 WHERE email_address =?`, [email_address]);
                if (result.affectedRows > 0) {
                    let selectRows = await pool.query(`SELECT first_name,last_name,mobile_number,email_address FROM customer_loyalty WHERE email_address =?`, [email_address]);
                    return { optOutEmailUpdate: selectRows };
                }
                return { optOutEmailUpdate: '' };
            }
        } catch (error) {
            throw error;
        }
    }

    async optIn(req) {
        const mobile_number = req.mobile_number;
        const email_address = req.email_address;
        const type = req.type;
        try {
            if (type === 1) {
                let result = await pool.query(`UPDATE customer_loyalty SET opt_out_from_sms_status = 0 WHERE mobile_number =?`, [mobile_number]);
                if (result.affectedRows > 0) {
                    let selectRows = await pool.query(`SELECT first_name,last_name,mobile_number,email_address FROM customer_loyalty WHERE email_address =?`, [email_address]);
                    return { optOutMobileUpdate: selectRows };
                }
                return { optOutMobileUpdate: '' };
            }
            else {
                let result = await pool.query(`UPDATE customer_loyalty SET opt_out_from_email_status = 0 WHERE email_address =?`, [email_address]);
                if (result.affectedRows > 0) {
                    let selectRows = await pool.query(`SELECT first_name,last_name,mobile_number,email_address FROM customer_loyalty WHERE email_address =?`, [email_address]);
                    return { optOutEmailUpdate: selectRows };
                }
                return { optOutEmailUpdate: '' };
            }
        } catch (error) {
            throw error;
        }
    }

    async otpLogs(countSMS: any, callback: any) {
        if (countSMS.no_of_sms) {
            let result = await pool.query('INSERT INTO customer_communication_sms_email_log ( no_of_sms,mobile_number,name ) values (?,?,?)', [countSMS.no_of_sms, countSMS.mobile_number, countSMS.name]).then(
                (result: any) => callback({ loginLogId: result.insertId })
            );
        }
        else {
            let result = await pool.query('INSERT INTO customer_communication_sms_email_log ( email_address,name ) values (?,?)', [countSMS.email_address, countSMS.name]).then(
                (result: any) => callback({ loginLogId: result.insertId })
            );
        }

        //console.log(result);
        //return result;

    }

    async   verifyOtp(req, callback) {
        const mobile_number = req.mobile_number;
        const otp = req.otp;
        try {
            const resultArray = await pool.query(`CALL verifyOTP (?,?,2,201,'VERIFYOTP');`, [mobile_number, otp]);

            if (Object.keys(resultArray).length < 1) {
                return callback({ message: 'Otp not insert' });
            }

            const otpResult = resultArray[0][0];

            if (!otpResult['statusCode'] || 'statusCode' in otpResult && otpResult['statusCode'] == 520) {
                return callback({ message: 'Somting Went Wrong', ...otpResult });
            }

            if (otpResult['statusCode'] == 104) {
                return callback(null, otpResult);
            }

            const customerRequiredFields = {
                date_of_birth: true,
                email_address: true,
                first_name: true,
                gender: true,
                last_name: true,
                marital_status: true,
                mobile_number: true,
                spouse_dob: false,
                anniversary_date: false
            }

            const requiredKey = ['first_name', 'last_name', 'mobile_number', 'email_address', 'date_of_birth', 'anniversary_date', 'spouse_dob', 'marital_status', 'gender', 'isRegister', 'status', 'message', 'otpAttempt', 'statusCode'];
            const response = this.filter(otpResult, ...requiredKey);
            //isRegister = 0 - new user, 201 existisng user but profile incomplete
            for (let key in customerRequiredFields) {
                if (customerRequiredFields[key] && !response[key]) {
                    if (response.isRegister == 1) {
                        response.isRegister = 201;
                    } else {
                        response.isRegister = 0;
                    }
                }
            }

            return callback(null, response);

        } catch (err) {
            return callback(err);
        }

    }
    async dataTableQuery(queryParam: DataTableQueryParam) {
        try {
            const { tableQuery, countQuery, havingCountQuery, bindingParams } = queryParam;
            if (!tableQuery || !countQuery) {
                throw new Error('(dataTableQuery) Parameter missing');
            }
            const tableRecord = await pool.query(`${tableQuery}`, bindingParams);
            //  + countQuery
            // const resultLength = tableRecord.length;
            /*  if (tableRecord.length !== 2) {
                 throw new Error(`dataTableQuery fail. Query result required 2 but result legth is ${resultLength}`)
             } */

            let rowsCount = 0;
            if (havingCountQuery == '') {
                rowsCount = await pool.query(countQuery, bindingParams);
            } else {
                const tableCount = await pool.query(countQuery, bindingParams);
                rowsCount = await pool.query(havingCountQuery); // found rows
            }
            return { items: tableRecord, total: rowsCount[0]['total'] };
        } catch (error) {
            throw error;
        }
    }

    async getMenu(userTypeId: number): Promise<item[]> {
        try {
            const result = await pool.query(`SELECT menu FROM menus WHERE user_type_id =? `, [userTypeId]);
            if (result.length) {
                return result[0].menu;
            }
            return [];
        } catch (error) {
            throw error;
        }
    }
    // pin codes
    async getPinCodes(input) {
        try {
            const result = await pool.query(`SELECT pin_codes.pin_code,pin_codes.city_id, cities.name as city_name FROM pin_codes 
            JOIN cities ON cities.id = pin_codes.city_id
            where pin_codes.pin_code LIKE  ?`, [`${input}%`]);

            if (result.length) {
                return { error: null, response: { pin_codes: result } };
            }
            return { error: null, response: { pin_codes: [] } };
        } catch (error) {
            return error;
        }
    }
    // cities
    async getAllCities(input) {
        try {
            if (input != '') {
                var result = await pool.query(`SELECT CONCAT(UPPER(SUBSTRING(city_name,1,1)),LOWER(SUBSTRING(city_name,2))) AS city_name FROM sub_merchant_locations WHERE city_name LIKE  ? GROUP BY city_name`, [`${input}%`]);
            } else {
                var result = await pool.query(`SELECT CONCAT(UPPER(SUBSTRING(city_name,1,1)),LOWER(SUBSTRING(city_name,2))) AS city_name FROM sub_merchant_locations GROUP BY city_name`, []);
            }
            if (result.length) {
                return { error: null, response: { cities: result } };
            }
            return { error: null, response: { cities: [] } };
        } catch (error) {
            return error;
        }

    }
}