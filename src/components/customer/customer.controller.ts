import { User } from '../../model/User';
import BaseController from '../../shared/controller/BaseController';
import { queryParam } from '../../shared/models/queryParams';
import CustomerRepository from './customer.repository';
import pool from '../../database/database-connection';
import CacheService from '../../shared/services/cache.service';

const customerRepository = new CustomerRepository();

class CustomerController extends BaseController {
    cacheService: CacheService;
    constructor() {
        super();
        this.cacheService = new CacheService(1000);
    }
    // Delete user by id
    deleteCustomer(req, res) {

    }
    // Search user
    async getCustomer(req, res, next) {

        customerRepository.getCustomers(req, (err, rows) => {
            if (err) {
                return next(err);
            }
            else {
                this.sendResponse(res, true, 200, { customerDetails: rows, message: "Customer profile fetched sucessfully" }, '');
            }
        });
    }

    //check for existing mobile number
    async checkMobileNumber(req, res, next) {
        CustomerRepository.checkMobileNumber(req, (err, result) => {
            if (err) {
                return next(err);
            }
            const data = { isRegister: false }
            if (result) {
                data['isRegister'] = true;
            }
            return this.sendResponse(res, true, 200, data, '');
        });
    }


    // Customer name suggestion
    async getCustomerSuggestion(req, res, next) {

        CustomerRepository.getCustomersSuggestion(req, (err, rows) => {
            if (err) {
                return next(err);
            }
            else {
                return this.sendResponse(res, true, 200, { customerDetails: rows, message: "Customer profile fetched sucessfully" }, '');
            }
        });
    }

    // get customer dashboard data
    async getCustomerDasboardDetails(req, res, next) {
        try {
            const input = JSON.stringify({ mobile_number: req.decoded.mobile_number, merchant_id: 1 });
            const { error, response } = await customerRepository.callgetCustomerDashboardDetailsSp(input);
            if (error) {
                return next(error);
            }
            return this.sendResponse(res, true, 200, response.data, response.message);
        } catch (error) {
            return next(error);
        };
    }
    // get customer crocs feed
    async getCustomerCrocsFeed(req, res, next) {
        try {
            const input = JSON.stringify({ mobile_number: req.decoded.mobile_number, merchant_id: 1 });
            const { error, response } = await customerRepository.callgetCustomerCrocsFeedSp(input);
            if (error) {
                return next(error);
            }
            return this.sendResponse(res, true, 200, response.data, response.message);
        } catch (error) {
            return next(error);
        };
    }
     // get customer crocs feed
     async getCustomerCouponsVoucher(req, res, next) {
        try {
            const input = JSON.stringify({ mobile_number: req.decoded.mobile_number, merchant_id: 1 });            
            const { error, response } = await customerRepository.callgetCustomerCouponsVoucherSp(input);
            if (error) {
                return next(error);
            }
            return this.sendResponse(res, true, 200, response.data, response.message);
        } catch (error) {
            return next(error);
        };
    }
    // customer feedback
    async customerFeedback(req, res, next) {
        try {
            let email = req.decoded.email_address;
            const dataObj = {
                fromEmail: email,
                toEmail: "customercare@crocsindia.com",
                message: req.body.message,
                subject: `Feedback of customer ${req.decoded.first_name} ${req.decoded.last_name}`,
                customerName: `${req.decoded.first_name} ${req.decoded.last_name}`
            }
            const { error, response } = await customerRepository.customerFeedback(req);
            if (error) {
                return next(error);
            }

            let result = await this.sendEmail('FEEDBACK', dataObj);
            if (result["statusCode"] == 200) {
                return this.sendResponse(res, true, 200, { message: "Mail Sent Successfully" }, "Mail Sent");
            }
            else {
                return this.sendResponse(res, false, 401, { message: "Mail Not Sent Successfully" }, "Mail Not Sent");
            }
        } catch (error) {
            return next(error);
        };
    }

    async updateCustomer(req, res, next) {
        try {
            const { request_source } = req.body;
            let updatedData = {};
            const { error, response } = await customerRepository.addOrUpdateCustomer(req);
            if (error) {
                return next(error);
            }
            const { statusCode, data, message } = response;
            const userInfo = updatedData = data;

            let user: User;
            if (this.checkRequestSource(request_source)) {
                data.isCustomer = true;
                const userData = await this.getUserData(data, true);
                updatedData = {
                    status: "SUCCESS",
                    statusCode: 100,
                    userData: userData,
                }
            }

            return this.sendResponse(res, true, statusCode, updatedData, message);
        } catch (error) {
            return next(error)
        }
    }

    async updateCoupons(req, res, next) {
        try {
            // console.log(req.body);
            const { request_source } = req.body;
            let updatedData = {};
            const response = await customerRepository.updateCoupons(req);
            if (response.affectedRows) {
                //for sms send
                let smsData = {
                    'milestoneId': req.body.milestone_id,
                    'couponValue': req.body.voucher_value,
                    'couponCode': req.body.voucher_code,
                    'couponValidity': new Date(req.body.expiry_date).toLocaleDateString(),
                    'mobile_number': req.body.mobile_number
                }
                let smsSent = await this.sendSMS('MILESTONE_COUPON', smsData);

                //for email send
                let emailData = {
                    customerName: `${req.body.first_name} ${req.body.last_name}`,
                    milestoneNumber: req.body.milestone_id,
                    voucherValue: req.body.voucher_value,
                    voucherCode: req.body.voucher_code,
                    expiryDate: new Date(req.body.expiry_date).toLocaleDateString(),
                    toEmail: req.body.email_address
                }

                let emailSent = await this.sendEmail('MILESTONE_REACHED', emailData);

                return this.sendResponse(res, true, 200, req.body, 'Coupans used successfully.');

            } else {
                return this.sendResponse(res, false, 520, {}, 'Failed to update.');
            }
            // const { statusCode, data, message } = response;


            //return this.sendResponse(res, true, statusCode, updatedData, message);
        } catch (error) {
            return next(error)
        }
    }

    async searchCustomer(req, res, next) {
        try {
            const { error, response } = await customerRepository.searchCustomer(req);

            if (error) {
                return next(error);
            }
            const { statusCode, message, data } = response;
            return this.sendResponse(res, true, statusCode, data, message);
        } catch (error) {
            return next(error);
        }
    }

    // Get Voucher details
    async getVoucherDetails(req, res) {
        let customer_loyalty_id = req.body.customer_loyalty_id;
        try {
            let result = await customerRepository.getVoucherDetails(customer_loyalty_id);
            if (Object.keys(result.voucher_details).length) {
                return this.sendResponse(res, true, 200, result, 'Voucher Details');
            } else {
                return this.sendResponse(res, false, 104, {}, 'No record found.');
            }
        } catch (err) {
            return this.sendResponse(res, false, 500, {}, 'Failed to get user details.');
        }

    }

    // Get registered customers
    async getRegisteredCustomers(req, res, next) {
        try {
            let currentUser = req.decoded;
            let userFilter = `cl.merchant_id = ${currentUser.merchant_id} AND (cl.sub_merchant_id = ${currentUser.sub_merchant_id} OR cl.sub_merchant_id IS NULL) AND cl.is_loyalty_user = 1 `;

            let filters = req.body.filter;
            if (filters) {
                for (let key in filters) {
                    if (key == 'from_date') {
                        userFilter += ` AND date_format(cl.created_at, '%Y-%m-%d') >= '${filters[key]}' `;
                        delete filters[key];
                    } else if (key == 'to_date') {
                        userFilter += ` AND date_format(cl.created_at, '%Y-%m-%d') <= '${filters[key]}' `;
                        delete filters[key];
                    }
                }
            }

            const params: queryParam = {
                tablesList: ['customer_loyalty'],
                tablesAlias: ['cl'],
                tablesColumns: [
                    ['id', 'first_name', 'last_name', 'mobile_number', 'current_purchase_value', 'email_address', 'gender', 'status', 'created_at']
                ],
                tablesJoins: [
                ],
                tablesColumnsAlias: [
                    `(SELECT SUM(calculated_amount) FROM customer_orders WHERE processed = 1 AND customer_loyalty_id = cl.id AND mobile_number = cl.mobile_number) AS lifetime_purchases`,
                    `(SELECT location_name FROM sub_merchant_locations WHERE id = cl.home_branch_id AND sub_merchant_id = IFNULL(cl.sub_merchant_id, 0)) AS location_name`,
                    `CONCAT_WS(' ', cl.first_name, cl.last_name) AS customer_name`
                    /* [`(SELECT SUM(calculated_amount) FROM customer_orders WHERE customer_loyalty_id = cl.id AND mobile_number = cl.mobile_number)`, `lifetime_purchases`],
                    [`(SELECT location_name FROM sub_merchant_locations WHERE id = cl.home_branch_id AND sub_merchant_id = IFNULL(cl.sub_merchant_id, 0))`, `location_name`],
                    [`CONCAT_WS(' ', cl.first_name, cl.last_name) AS customer_name`, `customer_name`] */
                ],
                tableIndexColumn: 'cl.id',
                userFilter: userFilter,
                ...req.body
            };
            const data = await this.generateQuery(params);

            // Get customer registration report snapshot or summary
            /* if (data.total > 0) {
                data['report_snapshot'] = await customerRepository.getSnapshot(currentUser);
            } else {
                data['report_snapshot'] = '';
            } */

            return this.sendResponse(res, true, 200, data, '');
        } catch (error) {
            return next(error);
        }
    }
    // Get store locations
    async  getSearchByLocations(req, res, next) {
        try {
            let cacheResponse: any;
            const reqBody = req.body;
            const searchKey = reqBody.search_keyword;
            const objCacheReponse = await this.cacheService.getValue(reqBody);

            if (objCacheReponse != null) {
                cacheResponse = objCacheReponse;
            } else {
                let { error, response } = await customerRepository.callGetStoreLocations(searchKey);
                if (error) {
                    return next(error);
                }
                this.cacheService.setValue(reqBody, response);
                cacheResponse = response;
            }
            return this.sendResponse(res, true, 200, cacheResponse, 'Store data');
        } catch (error) {
            next(error);
        }
    }

    async getManageCustomersList(req, res, next) {
        let currentUserTypeId = req.decoded.sub_merchant_id;
        try {
            let userFilter = `sub_merchant_id = ${currentUserTypeId}`;
            const params: queryParam = {
                tablesList: ['customer_loyalty', 'cities'],
                tablesAlias: ['cl', 'ct'],
                tablesColumns: [
                    ['id', 'first_name', 'last_name', 'mobile_number', 'email_address', 'gender', 'current_purchase_value', 'created_at', 'pin_code', 'marital_status', 'city_id', 'date_of_birth', 'anniversary_date', 'spouse_dob'],
                    ['name as city_name']
                ],
                tablesJoins: [
                    ['id', 'cl.city_id']
                ],
                tablesColumnsAlias: [
                    `CONCAT_WS(' ', cl.first_name, cl.last_name) AS customer_name`
                ],
                tableIndexColumn: 'cl.id',
                userFilter: userFilter,
                ...req.body
            };
            const data = await this.generateQuery(params);
            return this.sendResponse(res, true, 200, data, '');
        } catch (error) {
            return next(error);
        }
    }

    // Get customer registration report snapshot or summary
    async getSnapshot(req, res, next) {
        try {
            const currentUser = req.decoded;
            const response = await customerRepository.getSnapshot(currentUser);
            return this.sendResponse(res, true, 200, response, '');
        } catch (error) {
            return next(error);
        }
    }

}
export default CustomerController;