import * as bcrypt from 'bcrypt';
import BaseController from '../../shared/controller/BaseController';
import DateOperations from '../../shared/controller/DateOperations';
import { queryParam } from '../../shared/models/queryParams';
import MerchantusersRepository from './merchant-users.repository';

const merchantUsersRepository = new MerchantusersRepository();
const dateOperations = new DateOperations();

class MerchantusersController extends BaseController {

    // Get user details
    getUserDetails(objFilter) {
        return new Promise((resolve, reject) => {
            try {
                merchantUsersRepository.findOneByUsername(objFilter.username, (result: any) => {
                    let status = result ? true : false;
                    resolve({
                        data: result,
                        status: status,
                        msg: !status ? 'User not found.' : 'User already exist.'
                    });
                });
            } catch (err) {
                resolve({
                    data: err,
                    status: false
                });
            };
        });
    }

    // Get user list
    async getUserList(req, res, next) {
        try {
            let cusrrentUser = req.decoded;
            let userFilter = ''
            if (cusrrentUser.user_type_id == 1) {
                userFilter = `a.status != 2 AND a.user_type_id >= ${cusrrentUser.user_type_id} `;
            } else {
                userFilter = `a.status != 2 AND a.user_type_id > ${cusrrentUser.user_type_id} `;
            }
            switch (cusrrentUser.user_type_id) {
                case 3:
                    //listing merchant
                    userFilter += `AND a.merchant_id = ${cusrrentUser.merchant_id} `;
                    break;

                case 4:
                    //listing  submerchant
                    userFilter += `AND a.merchant_id = ${cusrrentUser.merchant_id}  AND a.sub_merchant_id = ${cusrrentUser.sub_merchant_id} `;
                    break;

                case 5:
                    //listing POS
                    userFilter = `a.user_type_id > ${cusrrentUser.user_type_id} AND a.merchant_id = ${cusrrentUser.merchant_id} AND a.sub_merchant_id = ${cusrrentUser.sub_merchant_id} AND a.sub_merchant_location_id = ${cusrrentUser.sub_merchant_location_id} `;
            }
            const params: queryParam = {
                tablesList: ['admins', 'user_types', 'merchants', 'sub_merchants', 'sub_merchant_locations'],
                tablesAlias: ['a', 'ut', 'm', 'sm', 'sml'],
                tablesColumns: [
                    ['id', 'first_name', 'last_name', 'user_type_id', 'merchant_id', 'sub_merchant_id', 'sub_merchant_location_id', 'username', 'email', 'contact', 'gender', 'status', 'created_at'],
                    ['name'],
                    ['merchant_name'],
                    ['sub_merchant_name'],
                    ['location_name']
                ],
                tablesJoins: [
                    ['id', 'a.user_type_id'],
                    ['id', 'a.merchant_id'],
                    ['id', 'a.sub_merchant_id'],
                    ['id', 'a.sub_merchant_location_id']
                ],
                tableIndexColumn: 'a.id',
                userFilter: userFilter,
                ...req.body
            };
            const data = await this.generateQuery(params);
            return this.sendResponse(res, true, 200, data, '');
        } catch (error) {
            return next(error);
        }
    }

    // Add user
    async addUser(reqBody, res) {
        let requestParams = reqBody.body;
        requestParams["created_by"] = reqBody.decoded.user_id;

        try {
            const userDetails: any = await this.getUserDetails(requestParams);
            if (userDetails.status) {
                return this.sendResponse(res, false, 104, {}, userDetails.msg);
            }

            //const salt = bcrypt.genSaltSync(10);
            requestParams.password = bcrypt.hashSync(requestParams.password, 10);
            delete requestParams.confirm_password;
            merchantUsersRepository.createOne(requestParams, (error, result) => {
                if (error) {
                    return this.sendResponse(res, false, 520, {}, 'Failed to add.');
                }

                if (result.user_id) {
                    return this.sendResponse(res, true, 200, {}, 'User created successfully.');
                } else {
                    return this.sendResponse(res, false, 520, {}, 'Failed to add.');
                }
            });
        } catch (err) {
            return this.sendResponse(res, false, 500, {}, 'Failed to add.');
        }

    }

    // Update user
    async updateUser(reqBody, res) {
        let requestParams = reqBody.body;
        (requestParams["password"] == "") ? delete requestParams["password"] : "";
        (requestParams["confirm_password"] == "") ? delete requestParams["confirm_password"] : "";
        requestParams["updated_by"] = reqBody.decoded.user_id;

        try {
            const userDetails: any = await this.getUserDetails(requestParams);
            if (!userDetails.status) {
                return this.sendResponse(res, false, 200, {}, userDetails.msg);
            }

            //const salt = bcrypt.genSaltSync(10);
            if (typeof requestParams["password"] != 'undefined') {
                requestParams["password"] = bcrypt.hashSync(requestParams["password"], 10);
                delete requestParams["confirm_password"];
            }

            merchantUsersRepository.updateOne(requestParams, (error, result) => {
                if (error) {
                    return this.sendResponse(res, false, 520, {}, 'Failed to update.');
                }

                if (result.affectedRows) {
                    return this.sendResponse(res, true, 200, {}, 'User updated successfully.');
                } else {
                    return this.sendResponse(res, false, 520, {}, 'Failed to update.');
                }
            });
        } catch (err) {
            return this.sendResponse(res, false, 500, {}, 'Failed to update.');
        }
    }

    // Check username availability
    async checkUsername(reqBody, res) {

        try {
            const userDetails: any = await this.getUserDetails(reqBody);
            if (userDetails.status) {
                return this.sendResponse(res, false, 200, {}, 'Username is already exist.');
            } else {
                return this.sendResponse(res, true, 200, {}, 'Username is available.');
            }
        } catch (err) {
            return this.sendResponse(res, false, 500, {}, 'Failed to check username.');
        }
    }

    // Get user types
    async getUserTypes(reqBody, res) {
        try {
            let result = await merchantUsersRepository.getUserTypes(reqBody.decoded.user_type_id);
            if (Object.keys(result.user_type_list).length) {
                return this.sendResponse(res, true, 200, result, 'User Types.');
            } else {
                return this.sendResponse(res, false, 104, {}, 'No record found.');
            }
        } catch (err) {
            return this.sendResponse(res, false, 500, {}, 'Failed to get user types.');
        }
    }

    // Get user profile details
    async getUserProfileDetails(reqBody, res) {
        try {
            let result = await merchantUsersRepository.getUserProfileDetails(reqBody.decoded.user_id);
            if (Object.keys(result.profile_details).length) {
                return this.sendResponse(res, true, 200, result, 'Profile Details');
            } else {
                return this.sendResponse(res, false, 104, {}, 'No record found.');
            }
        } catch (err) {
            return this.sendResponse(res, false, 500, {}, 'Failed to get user details.');
        }
    }

    // Delete user
    async deleteUser(reqBody, res) {
        let requestParams = reqBody.body;

        try {
            requestParams.status = 2;
            requestParams.updated_by = reqBody.decoded.user_id;
            requestParams.deleted_at = dateOperations.currentDatetime;
            merchantUsersRepository.updateOne(requestParams, (error, result) => {
                if (error) {
                    return this.sendResponse(res, false, 520, {}, 'Failed to delete user.');
                }

                if (result.affectedRows) {
                    return this.sendResponse(res, true, 200, {}, 'User deleted successfully.');
                } else {
                    return this.sendResponse(res, false, 520, {}, 'Failed to delete user.');
                }
            });
        } catch (err) {
            return this.sendResponse(res, false, 500, {}, 'Failed to delete user.');
        }
    }

    // Get login logs
    async getLoginLogs(reqBody, res) {
        let requestParams = reqBody.body;

        try {
            let result = await merchantUsersRepository.getLoginLogs(requestParams.id);
            if (Object.keys(result.login_logs).length) {
                return this.sendResponse(res, true, 200, result, 'User Login logs.');
            } else {
                return this.sendResponse(res, false, 104, {}, 'No record found.');
            }
        } catch (err) {
            return this.sendResponse(res, false, 500, {}, 'Failed to get login logs.');
        }
    }

    async logout(req, res, next) {
        try {
            merchantUsersRepository.logout(req.decoded.loginLogId, (error, result) => {
                if (error) {
                    return this.sendResponse(res, false, 520, {}, 'Failed to logout.');
                }

                if (result.affectedRows) {
                    return this.sendResponse(res, true, 200, {}, 'Logout successfully.');
                } else {
                    return this.sendResponse(res, false, 520, {}, 'Failed to logout.');
                }
            });
        }
        catch (err) {
            return next(err);
        }
    }

    //Transation reports
    async getTransactionsReport(req, res, next) {
        try {
            let currentUser = req.decoded;
            let location_id = currentUser.sub_merchant_location_id;
            // let userFilter = 'co.location_id = ' + location_id;
            let userFilter = `cl.merchant_id = ${currentUser.merchant_id} AND (cl.sub_merchant_id = ${currentUser.sub_merchant_id} OR cl.sub_merchant_id IS NULL) AND cl.is_loyalty_user = 1 AND co.processed = 1`;

            let filters = req.body.filter;

            if (filters) {
                for (let key in filters) {
                    if (filters[key]) {
                        const filterValue = filters[key].trim().replace(/[\\$'"]/g, "\\$&");
                        if (key == 'from_date') {

                            userFilter += ` AND co.order_date >= '${filterValue}' `;
                            delete filters[key];
                        } else if (key == 'to_date') {
                            userFilter += ` AND co.created_at <= '${filterValue}' `;
                            delete filters[key];
                        }
                    }
                }
            }

            const params: queryParam = {
                tablesList: ['customer_orders', 'customer_loyalty', 'sub_merchant_locations'],
                tablesAlias: ['co', 'cl', 'sml'],
                tablesColumns: [
                    ['id', 'location_id', 'order_number', 'order_date', 'order_amount', 'calculated_amount', 'mobile_number'],
                    ['first_name', 'last_name'],
                    ['location_name']
                ],
                tablesJoins: [
                    ['id', 'co.customer_loyalty_id'],
                    ['id', 'co.location_id']
                ],
                tablesColumnsAlias: [
                    `CONCAT_WS(' ', cl.first_name, cl.last_name) AS customer_name`
                ],
                tableIndexColumn: 'co.id',
                userFilter: userFilter,
                ...req.body
            };
            const data = await this.generateQuery(params);

            // Get transaction report snapshot or summary
            /* if(data.total > 0) {
                data['report_snapshot'] = await merchantUsersRepository.getSnapshot(currentUser);
            } else {
                data['report_snapshot'] = '';
            } */
            return this.sendResponse(res, true, 200, data, '');
        } catch (error) {
            return next(error);
        }

    }

    //Voucher reports
    async voucherReports(req, res, next) {
        try {
            /* let currentUser = req.decoded;
            let userFilter = `cm.merchant_id = ${cusrrentUser.merchant_id} AND cl.sub_merchant_id = ${cusrrentUser.sub_merchant_id} AND cl.is_loyalty_user = 1 AND cm.coupon_used = 1`;
            const params: queryParam = {
                tablesList: ['customer_milestones', 'customer_loyalty', 'customer_orders', 'sub_merchant_locations'],
                tablesAlias: ['cm', 'cl', 'co', 'sml'],
                tablesColumns: [
                    ['id', 'voucher_code', 'coupon_used'],
                    ['first_name', 'last_name', 'mobile_number'],
                    ['order_number', 'order_date', 'location_id', 'purchased_from'],
                    ['location_name']
                ],
                tablesJoins: [
                    ['id', 'cm.customer_loyalty_id'],
                    ['voucher_applied', 'cm.voucher_code'],
                    ['id', 'co.location_id']
                ],
                tablesColumnsAlias: [
                ]
                ,
                tableIndexColumn: 'cm.id',
                userFilter: userFilter,
                ...req.body
            };
            params.pageSize = 5;
            const data = await this.generateQuery(params);

            let userFilter1 = `cl.merchant_id = ${cusrrentUser.merchant_id} AND cl.sub_merchant_id = ${cusrrentUser.sub_merchant_id} AND cl.is_loyalty_user = 1 AND mcou.coupon_used = 1`;
            const params1: queryParam = {
                tablesList: ['merchant_coupons', 'customer_loyalty', 'customer_orders', 'sub_merchant_locations'],
                tablesAlias: ['mcou', 'cl', 'co', 'sml'],
                tablesColumns: [
                    ['id', 'coupon_code', 'coupon_used'],
                    ['first_name', 'last_name', 'mobile_number'],
                    ['order_number', 'order_date', 'location_id', 'purchased_from'],
                    ['location_name']
                ],
                tablesJoins: [
                    ['id', 'mcou.customer_loyalty_id'],
                    ['voucher_applied', 'mcou.coupon_code'],
                    ['id', 'co.location_id']
                ],
                tablesColumnsAlias: [
                    `mcou.coupon_code AS voucher_code`
                ]
                ,
                tableIndexColumn: 'mcou.id',
                userFilter: userFilter1,
                ...req.body
            };
            params1.pageSize = 5;
            const data1 = await this.generateQuery(params1);

            const result = [...data.items, ...data1.items];
            const a = {items:result, total: (data.total + data1.total)}; */

            const params = req;
            const data = await merchantUsersRepository.voucherRedemptionReport(params);
            return this.sendResponse(res, true, 200, data, '');
        } catch (error) {
            return next(error);
        }
    }

    // get customer dashboard data
    async getPOSDasboardDetails(req, res, next) {
        try {
            req.body["user_id"] = req.decoded.user_id;
            req.body["sub_merchant_id"] = req.decoded.sub_merchant_id;
            req.body["user_type_id"] = req.decoded.user_type_id;
            if (req.decoded.user_type_id == 5) {
                req.body["sub_merchant_location_id"] = req.decoded.sub_merchant_location_id;
            }
            const { error, response } = await merchantUsersRepository.callgetPOSDashboardDetailsSp(req.body);
            if (error) {
                return next(error);
            }
            return this.sendResponse(res, true, 200, response, '');
        } catch (error) {
            return next(error);
        };
    }

    //Voucher reports download
    async voucherReportsDownload(req, res, next) {
        try {
            let result = await merchantUsersRepository.voucherReportsDownload();
            if (Object.keys(result.voucher_export).length) {
                return this.sendResponse(res, true, 200, result, 'Voucher Export');
            } else {
                return this.sendResponse(res, false, 104, {}, 'No record found.');
            }
        } catch (err) {
            return this.sendResponse(res, false, 500, {}, 'Failed to get user details.');
        }
    }

    // Get transaction report snapshot or summary
    async getTransactionSnapshot(req, res, next) {
        try {
            const currentUser = req.decoded;
            const response = await merchantUsersRepository.getTransactionSnapshot(currentUser);
            return this.sendResponse(res, true, 200, response, '');
        } catch (error) {
            return next(error);
        }
    }

    // Get voucher redemption report snapshot or summary
    async getVoucherRedemptionSnapshot(req, res, next) {
        try {
            const currentUser = req.decoded;
            const response = await merchantUsersRepository.getVoucherRedemptionSnapshot(currentUser);
            return this.sendResponse(res, true, 200, response, '');
        } catch (error) {
            return next(error);
        }
    }

}

export default MerchantusersController;