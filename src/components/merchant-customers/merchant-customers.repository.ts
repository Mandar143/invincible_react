import * as jwt from 'jsonwebtoken';
import Config from '../../config/config';
import constants from '../../config/constants';
import pool from '../../database/database-connection';
import { User } from '../../model/User';
import BaseController from '../../shared/controller/BaseController';
import { ResultSetHeader } from '../../shared/models/ResultSetHeader.model';
import { SpResponse } from '../../shared/models/SpResponse';
import { Mobilenumberchange } from './mobile-number-change.model';
const baseCtrl = new BaseController();


const countryId = 82;
export interface PendingRequest {
    type: number;
    customer_loyalty_id: number;
}
export default class MerchantcustomersRepository {

    async getMobileNumberChangeLog(item: any, callback: any) {
        let totalCountSql = '';
        let totalCount: number = 0;
        let sql = '';
        let sqlWhere = '';
        let sqlHaving = '';
        let sqlJoins = '';
        let sortField = 'cmncl.created_at';
        let sortOrder = 'DESC';
        let startNum = 1;
        let limitNum = 10;
        if (item.body.start != '' || item.body.pageSize != '') {
            //parse int Convert String to number
            startNum = parseInt(item.body.pageNumber);
            limitNum = parseInt(item.body.pageSize);
            startNum = (startNum - 1) * limitNum;
        }

        let subMerchantId = item.decoded.sub_merchant_id;

        sql += "SELECT cmncl.id, cmncl.customer_loyalty_id,cmncl.existing_mobile_number, cmncl.new_mobile_number, cmncl.requested_from, cmncl.changed_from, cmncl.status, cmncl.created_at, cmncl.updated_at, CONCAT(cl1.first_name, ' ',cl1.last_name) AS customer_name, ";
        sql += "CASE WHEN cmncl.requested_from = 1 THEN CONCAT(a1.first_name, ' ', a1.last_name) WHEN cmncl.requested_from = 2 THEN CONCAT(cl2.first_name, ' ', cl2.last_name) ELSE '' END AS requested_by_name, ";
        sql += "CASE WHEN cmncl.changed_from = 1 THEN CONCAT(a2.first_name, ' ', a2.last_name) WHEN cmncl.changed_from = 2 THEN CONCAT(cl3.first_name, ' ', cl3.last_name) ELSE '' END AS updated_by_name ";
        sql += "FROM customer_mobile_number_change_log cmncl";
        sqlJoins += " LEFT JOIN customer_loyalty cl1 ON cmncl.customer_loyalty_id = cl1.id";
        sqlJoins += " LEFT JOIN customer_loyalty cl2 ON cmncl.created_by = cl2.id";
        sqlJoins += " LEFT JOIN customer_loyalty cl3 ON cmncl.updated_by = cl3.id";
        sqlJoins += " LEFT JOIN admins a1 ON cmncl.created_by = a1.id";
        sqlJoins += " LEFT JOIN admins a2 ON cmncl.updated_by = a2.id";
        sqlWhere += " WHERE cmncl.sub_merchant_id = " + subMerchantId;

        // filters
        if (Object.keys(item.body.filter).length > 0) {
            let filters = item.body.filter;

            Object.keys(filters).forEach(function (key) {
                if (key == 'customer_name') {
                    //sqlHaving += key + ' LIKE "' + filters[key] + '%" OR ' + key + ' LIKE " ' + filters[key] + '%"';
                    sqlWhere += ' AND (CONCAT(cl1.first_name, " ",cl1.last_name) LIKE "' + filters[key] + '%" OR cl1.last_name LIKE "' + filters[key] + '%")';
                } else if (key == 'from_date' || key == 'to_date') {
                    if (key == 'from_date') {
                        sqlWhere += ' AND cmncl.created_at >= "' + filters[key] + '"';
                    } else if (key == 'to_date') {
                        sqlWhere += ' AND cmncl.created_at <= "' + filters[key] + '"';
                    }
                } else if (typeof filters[key] == 'number') {
                    sqlWhere += ' AND ' + key + ' = ' + filters[key];
                } else {
                    sqlWhere += ' AND ' + key + ' LIKE "' + filters[key] + '%"';
                }
            });


        }

        // sort
        if (item.body.sortField != '') {
            sortField = item.body.sortField;
        }
        if (item.body.sortOrder != '') {
            sortOrder = item.body.sortOrder;
        }

        // sqlHaving = (sqlHaving.length != 0) ? ' HAVING ' + sqlHaving : '';
        // sql += sqlJoins + " " + sqlWhere + " " + sqlHaving;
        sql += sqlJoins + " " + sqlWhere;
        sql += ` ORDER BY ${sortField} ${sortOrder} LIMIT ${limitNum} OFFSET ${startNum}`;

        //console.log("sql", sql);

        //sql to get total row count
        totalCountSql = "SELECT COUNT(cmncl.id) as cnt FROM customer_mobile_number_change_log cmncl";
        totalCountSql += sqlJoins + " " + sqlWhere + " " + sqlHaving;

        //execute query to get total count
        let resultCount = await pool.query(totalCountSql, null);
        totalCount = resultCount[0].cnt;
        if (totalCount > 0) {
            //execute query to get user list
            let result = await pool.query(sql, null);

            if (Object.keys(result).length == 0)
                return false;

            return { change_log: result, total_count: totalCount };
        } else {
            return false;
        }
    }

    async getHomeBranchChangeRequests(item: any, callback: any) {
        let totalCountSql = '';
        let totalCount: number = 0;
        let sql = '';
        let sqlWhere = '';
        let sqlJoins = '';
        let sortField = 'chbcl.created_at';
        let sortOrder = 'DESC';
        let startNum = 1;
        let limitNum = 10;
        if (item.body.start != '' || item.body.pageSize != '') {
            //parse int Convert String to number
            startNum = parseInt(item.body.pageNumber);
            limitNum = parseInt(item.body.pageSize);
            startNum = (startNum - 1) * limitNum;
        }

        let subMerchantId = item.decoded.sub_merchant_id;

        sql += "SELECT chbcl.id, chbcl.customer_loyalty_id, chbcl.status, chbcl.created_at, chbcl.updated_at, sml1.location_name AS old_home_branch, sml2.location_name AS new_home_branch, CONCAT(cl1.first_name, ' ',cl1.last_name) AS customer_name, ";
        sql += "CONCAT(a1.first_name, ' ',a1.last_name) AS requested_by_name, ";
        sql += "CONCAT(a2.first_name, ' ',a2.last_name) AS updated_by_name ";
        sql += "FROM customer_home_branch_change_log chbcl";
        sqlJoins += " LEFT JOIN customer_loyalty cl1 ON chbcl.customer_loyalty_id = cl1.id";
        sqlJoins += " LEFT JOIN customer_loyalty cl2 ON chbcl.created_by = cl2.id";
        sqlJoins += " LEFT JOIN customer_loyalty cl3 ON chbcl.updated_by = cl3.id";
        sqlJoins += " LEFT JOIN admins a1 ON chbcl.created_by = a1.id";
        sqlJoins += " LEFT JOIN admins a2 ON chbcl.updated_by = a2.id";
        sqlJoins += " LEFT JOIN sub_merchant_locations sml1 ON chbcl.existing_home_branch_id = sml1.id";
        sqlJoins += " LEFT JOIN sub_merchant_locations sml2 ON chbcl.new_home_branch_id = sml2.id";
        sqlWhere += " WHERE chbcl.sub_merchant_id = " + subMerchantId;

        // filters
        if (Object.keys(item.body.filter).length > 0) {
            let filters = item.body.filter;

            Object.keys(filters).forEach(function (key) {
                console.log("key", key);

                if (key == 'customer_name') {
                    //sqlHaving += key + ' LIKE "' + filters[key] + '%" OR ' + key + ' LIKE " ' + filters[key] + '%"';
                    sqlWhere += ' AND (CONCAT(cl1.first_name, " ",cl1.last_name) LIKE "' + filters[key] + '%" OR cl1.last_name LIKE "' + filters[key] + '%")';
                } else if (key == 'from_date' || key == 'to_date') {
                    if (key == 'from_date') {
                        sqlWhere += ' AND chbcl.created_at >= "' + filters[key] + '"';
                    } else if (key == 'to_date') {
                        sqlWhere += ' AND chbcl.created_at <= "' + filters[key] + '"';
                    }
                } else if (key == 'existing_home_branch') {
                    sqlWhere += ' AND sml1.location_name LIKE "' + filters[key] + '%"';
                } else if (typeof filters[key] == 'number') {
                    sqlWhere += ' AND ' + key + ' = ' + filters[key];
                } else {
                    sqlWhere += ' AND ' + key + ' LIKE "' + filters[key] + '%"';
                }
            });
        }

        // sort
        if (item.body.sortField != '') {
            sortField = item.body.sortField;
        }
        if (item.body.sortOrder != '') {
            sortOrder = item.body.sortOrder;
        }

        sql += sqlJoins + " " + sqlWhere;
        sql += ` ORDER BY ${sortField} ${sortOrder} LIMIT ${limitNum} OFFSET ${startNum}`;

        // console.log("sql", sql);

        //sql to get total row count
        totalCountSql = "SELECT COUNT(chbcl.id) as cnt FROM customer_home_branch_change_log chbcl";
        totalCountSql += sqlJoins + " " + sqlWhere;

        //execute query to get total count
        let resultCount = await pool.query(totalCountSql, null);
        totalCount = resultCount[0].cnt;
        if (totalCount > 0) {
            //execute query to get user list
            let result = await pool.query(sql, null);

            if (Object.keys(result).length == 0)
                return false;

            return { change_log: result, total_count: totalCount };
        } else {
            return false;
        }
    }

    async getCustomers(req, callback: any) {
        try {
            let customerObject = {
                customerDetails: null,
                milestoneDetails: null,
                mobileNumberChecked: null
            }
            customerObject.customerDetails = await pool.query(`SELECT c.id,c.first_name,c.last_name,c.mobile_number,c.gender,c.mobile_verified, c.email_address,c.email_verified,c.merchant_id,c.sub_merchant_id,c.status,c.date_of_birth,c.marital_status,c.anniversary_date,c.spouse_dob,c.loyalty_id,ct.name as city FROM customer_loyalty c LEFT JOIN cities ct ON ct.id = c.city_id WHERE c.mobile_number='${req.old_mobile_number}'`, null);
            // customerObject.milestoneDetails = await pool.query('CALL getCustomerDashboardDetails(?)', [customerObject.customerDetails[0].mobile_number]);
            let mobileChecked = await pool.query(`SELECT mobile_number FROM customer_loyalty WHERE mobile_number='${req.new_mobile_number}'`, null)
            // console.log("mobilechecked", mobileChecked);

            if (Object.keys(mobileChecked).length == 0) {
                customerObject.mobileNumberChecked = true;
                // console.log(customerObject);
            } else {
                customerObject.mobileNumberChecked = false;
                // console.log(customerObject);
            }
            return callback(null, customerObject);
        } catch (error) {
            return callback({ message: error.mesage })
        }
    }

    async getState(params): Promise<{ stateList: {} | []; message: string; statusCode?: number }> {
        try {
            const result = await pool.query(`SELECT DISTINCT state_name FROM sub_merchant_locations WHERE status = 1 AND city_name LIKE ? `, [`${params.city_name}%`]);
            const response = { stateList: result, message: 'State List.' };
            if (!Object.keys(result).length) {
                Object.assign(response, { statusCode: 104, message: 'No record found.' })
            }
            return response;
        } catch (error) {
            throw error;
        }
    }

    async getCity(params): Promise<{ cityList: {} | []; message: string; statusCode?: number }> {
        try {
            const result = await pool.query(`SELECT DISTINCT city_name FROM sub_merchant_locations WHERE status = 1 AND city_name like ?`, [`${params.city_name}%`]);
            const response = { cityList: result, message: 'City List.' };
            if (!Object.keys(result).length) {
                Object.assign(response, { statusCode: 104, message: 'No record found.' })
            }
            return response;
        } catch (error) {
            throw error;
        }
    }

    //to get store locations
    async getStoreLocations(item: any) {
        try {
            const result = await pool.query('SELECT id, location_name FROM sub_merchant_locations WHERE state_name = ? AND city_name = ? AND status = 1', [item.state_name, item.city_name]);
            return { location_list: result };
        } catch (error) {
            throw error;
        }
    }

    async getOrderDetails(item: any) {
        try {
            const result = await pool.query('SELECT pm.material_description as product_name,cod.sku,cod.product_quantity,cod.product_mrp  FROM customer_order_details as cod LEFT JOIN product_master as pm ON cod.sku=pm.sku where cod.order_id = ?;', [item.id]);
            return result;
        } catch (error) {
            throw error;
        }
    }

    async insertMobileNumberChangeLog(item: Mobilenumberchange) {
        try {
            if (item.sub_merchant_id == null) {
                item.sub_merchant_id = 0;
            }
            let result = await pool.query('CALL checkAndInsertMobileNumberChangeLog(?,?,?,?,?,?)', [item.sub_merchant_id, item.customer_loyalty_id, item.existing_mobile_number, item.new_mobile_number, item.requested_from, item.created_by]);
            // console.log("item", item);

            let status = result[0][0].status;

            if (status == 'SUCCESS') {
                let mobileChangeId = result[0][0].lastInsertedId;
                let updated_by = item.customer_loyalty_id;
                jwt.sign(
                    {
                        data: {
                            mobileChangeId,
                            updated_by
                        }
                    }, Config.AUTHORIZATION_KEY, {
                        expiresIn: '1d'
                    }, (err, token) => {
                        if (token) {
                            let cancelUrl = "http://localhost:4200/cancel-mobile-change-request/?q=" + token;
                            console.log("cancelUrl", cancelUrl, "id:", mobileChangeId);
                        }
                        else {
                            console.log(err);
                        }
                    });

                return true;
            } else {
                return false;
            }
        } catch (error) {
            throw error;
        }
    }

    async checkForPendingRequest(req) {
        try {
            const validTypes = [1, 2];// 1 : change home branch , 2: change mobile numbmer
            const params: PendingRequest = req.body;
            const aColumns = [];
            let sql = '';
            let response = {};
            if (params.type === 1) {
                sql = `SELECT ch.id, ch.customer_loyalty_id, sml1.location_name AS existing_home_branch, sml2.location_name AS new_home_branch,ch.new_home_branch_id AS new_home_branch_id,sml2.state_name,sml2.city_name `;
                sql += `FROM customer_home_branch_change_log ch `;
                sql += `LEFT JOIN sub_merchant_locations sml1 ON ch.existing_home_branch_id = sml1.id `;
                sql += `LEFT JOIN sub_merchant_locations sml2 ON ch.new_home_branch_id = sml2.id `;
                sql += `WHERE ch.status = 1 AND ch.customer_loyalty_id = ? ORDER BY ch.created_at DESC LIMIT 1`;
            } else {
                sql = `SELECT id AS request_id, customer_loyalty_id, existing_mobile_number, new_mobile_number FROM customer_mobile_number_change_log WHERE status = 1 AND customer_loyalty_id = ? ORDER BY created_at DESC LIMIT 1`;
            }
            // console.log(sql);
            const result = await pool.query(sql, [params.customer_loyalty_id]);

            if (!Object.keys(result).length) {
                response = null
            } else {
                response = Object.assign(response, result[0]);
            }
            return { error: null, response: response };
        } catch (error) {
            throw error;
        }
    }

    checkValidRequest(req, functionName: string) {
        const bodyParams = req.body;
        const allowedRequestTypes = [2, 3]; // 2 for change mobile request, 3 for change home branch request
        if (allowedRequestTypes.indexOf(bodyParams.request_type) === -1) {
            throw new Error(`Invalid request type : ${functionName}`);
        }
    }

    async callChangeRequestStatusSP(params: string) {
        const spStatus = await pool.query(`CALL approveRejectRequest  (?);`, [params]).then((result: ResultSetHeader) => result);;
        if (Object.keys(spStatus).length !== 2) {
            throw new Error('Procedure Error fn(approveRejectRequest )');
        }

        //collect result
        const selectResut = <SpResponse>spStatus[0][0]['response'];

        if (!selectResut.statusCode || selectResut.statusCode > 200) {
            return { error: selectResut };
        }
        return { error: null, response: selectResut };
    }

    async changeRequestStatus(req) {
        try {
            this.checkValidRequest(req, 'changeRequestStatus');
            const bodyParams = req.body;
            const currentUser = <User>req.decoded;
            let defaultInputs = {
                updated_by: currentUser.user_id,
                changed_from: 2
            };

            if (currentUser.isMerchant) {
                defaultInputs['changed_from'] = 1;
            }

            const params = JSON.stringify({ ...defaultInputs, ...bodyParams });
            let { error, response } = await this.callChangeRequestStatusSP(params);
            if (error) {
                return { error: error };
            }

            /* if (response.statusCode == 200 && bodyParams.status == 2 && bodyParams.request_type == 3) {
                const baseCtrl = new BaseController();
                await baseCtrl.sendEmail('CHANGE_HOME_BRANCH_APPROVED', response.data.user_data);
                delete response.data.user_data;
            } */

            return { error: null, response };
        } catch (error) {
            console.log('error', error);

            throw error;
        }
    }

    //move to customer respository
    async getTransactions(item: any) {
        let totalCountSql = '';
        let totalCount: number = 0;
        let sql = '';
        let sqlWhere = '';
        let sqlJoins = '';
        let sortField = 'cmncl.created_at';
        let sortOrder = 'DESC';
        let startNum = 1;
        let limitNum = 10;
        if (item.body.start != '' || item.body.pageSize != '') {
            //parse int Convert String to number
            startNum = parseInt(item.body.pageNumber);
            limitNum = parseInt(item.body.pageSize);
            startNum = (startNum - 1) * limitNum;
        }

        let subMerchantId = item.decoded.sub_merchant_id;
        let mobile_number = item.body.mobile_number;


        sql += "SELECT *, CASE WHEN order_status = 1 THEN 'Ordered' WHEN order_status = 3 THEN 'Partially' WHEN order_status = 4 THEN 'Returned'  ELSE '-' END AS order_status_text FROM customer_orders WHERE mobile_number = '" + mobile_number + "'";


        // filters
        if (Object.keys(item.body.filter).length > 0) {
            let filters = item.body.filter;
            Object.keys(filters).forEach(function (key) {
                if (key == 'status' && filters[key] == '0') {
                    sqlWhere += '';
                } else {
                    sqlWhere += ' AND order_status = "' + filters[key] + '"';
                }
            });


        }

        // sort
        if (item.body.sortField != '') {
            sortField = item.body.sortField;
        }
        if (item.body.sortOrder != '') {
            sortOrder = item.body.sortOrder;
        }

        // sql += sqlJoins + " " + sqlWhere + " " + sqlHaving;
        sql += sqlJoins + " " + sqlWhere;
        sql += ` ORDER BY ${sortField} ${sortOrder} LIMIT ${limitNum} OFFSET ${startNum}`;

        // console.log("sql", sql);

        //sql to get total row count
        totalCountSql = "SELECT COUNT(id) as cnt FROM customer_orders WHERE mobile_number = '" + mobile_number + "'";
        totalCountSql += sqlJoins + " " + sqlWhere;

        //execute query to get total count
        let resultCount = await pool.query(totalCountSql, null);
        totalCount = resultCount[0].cnt;
        if (totalCount > 0) {
            //execute query to get user list
            let result = await pool.query(sql, null);

            if (Object.keys(result).length == 0)
                return false;

            return { change_log: result, total_count: totalCount };
        } else {
            return false;
        }
    }

    async callChangeRequestFromCustomerSP(params: string) {
        const spStatus = await pool.query(`CALL changeRequestFromCustomer (?);`, [params]).then((result: ResultSetHeader) => result);;
        if (Object.keys(spStatus).length !== 2) {
            throw new Error('Procedure Error fn(callChangeRequestFromCustomerSP)');
        }

        //collect result
        const selectResut = <SpResponse>spStatus[0][0]['response'];
        const allowStatusCode = [104, 102, 108, 200,];

        if (!selectResut.statusCode || selectResut.statusCode > 200) {
            // const requiredKey = ['status', 'message', 'statusCode'];
            // const response = this.filter(selectResut, ...requiredKey);
            return { error: selectResut };
        }
        return { error: null, response: selectResut };
    }

    async changeRequestFromCustomer(req) {
        try {
            const allowedRequestTypes = [2, 3]; // 2 for change mobile request, 3 for change home branch request

            const bodyParams = req.body;
            if (allowedRequestTypes.indexOf(bodyParams.request_type) === -1) {
                throw new Error('Invalid request type : fn(changeRequestFromCustomer)');
            }
            const currentUser = <User>req.decoded;
            let defaultInputs = {
                merchant_id: constants.merchantId,
                sub_merchant_id: currentUser.sub_merchant_id,
                created_by: currentUser.user_id,
                requested_from: 2
            };

            if (currentUser.isMerchant) {
                defaultInputs['requested_from'] = 1;
            }

            // defaultInputs = { ...defaultInputs, ...bodyParams };

            const params = JSON.stringify({ ...defaultInputs, ...bodyParams });
            // console.log(defaultInputs);
            let { error, response } = await this.callChangeRequestFromCustomerSP(params);

            if (error) {
                return { error: error };
            }

            return { error: null, response };
        } catch (error) {
            throw error;
        }
    }
}