import BaseController from '../../shared/controller/BaseController';
import { queryParam } from '../../shared/models/queryParams';
import CustomerRepository from '../customer/customer.repository';
import MerchantcustomersRepository from './merchant-customers.repository';
const customerRepository = new CustomerRepository();
const merchantCustomersRepository = new MerchantcustomersRepository();
import * as jwt from 'jsonwebtoken';
import Config from '../../config/config';
class MerchantcustomersController extends BaseController {

    // Get mobile number change log
    async getMobileNumberChangeLog(req, res, next) {
        try {
            let currentUser = req.decoded;
            let userFilter = `cm.sub_merchant_id = ${currentUser.sub_merchant_id}`;

            let filters = req.body.filter;
            if (filters) {
                for (let key in filters) {
                    if (key == 'existing_mobile_number') {
                        userFilter += ` AND (cm.existing_mobile_number LIKE '${filters[key]}%' OR cm.new_mobile_number LIKE '${filters[key]}%')`
                        delete filters[key];
                    } else if (key == 'from_date') {
                        userFilter += ` AND date_format(cm.created_at, '%Y-%m-%d') >= '${filters[key]}' `;
                        delete filters[key];
                    } else if (key == 'to_date') {
                        userFilter += ` AND date_format(cm.created_at, '%Y-%m-%d') <= '${filters[key]}' `;
                        delete filters[key];
                    }
                }
            }

            const params: queryParam = {
                tablesList: ['customer_mobile_number_change_log', 'customer_loyalty', 'customer_loyalty', 'customer_loyalty', 'admins', 'admins'],
                tablesAlias: ['cm', 'cl1', 'cl2', 'cl3', 'ad1', 'ad2'],
                tablesColumns: [
                    ['id', 'customer_loyalty_id', 'existing_mobile_number', 'new_mobile_number', 'requested_from', 'changed_from', 'status', 'created_at', 'updated_at'],
                ],
                tablesJoins: [
                    ['id', 'cm.customer_loyalty_id'],
                    ['id', 'cm.created_by'],
                    ['id', 'cm.updated_by'],
                    ['id', 'cm.created_by'],
                    ['id', 'cm.updated_by']
                ],
                tablesColumnsAlias: [
                    `CASE WHEN cm.requested_from = 1 THEN CONCAT_WS(' ',ad1.first_name,ad1.last_name,'(WebPOS)') WHEN cm.requested_from = 2 THEN CONCAT_WS(' ',cl2.first_name,cl2.last_name,'(WebSite)') ELSE '' END AS requested_by_name`,
                    `CASE WHEN cm.changed_from = 1 THEN CONCAT_WS(' ',ad2.first_name,ad2.last_name,'(WebPOS)') WHEN cm.changed_from = 2 THEN CONCAT_WS(' ',cl3.first_name,cl3.last_name,'(WebSite)') ELSE '' END AS updated_by_name`,
                    `CONCAT_WS(' ', cl1.first_name, cl1.last_name) AS customer_name`
                ],
                tableIndexColumn: 'cm.id',
                userFilter: userFilter,
                ...req.body
            };
            const data = await this.generateQuery(params);

            return this.sendResponse(res, true, 200, data, '');
        } catch (err) {
            return next(err);
        }
    }

    // Get home branch change request log
    async getHomeBranchChangeRequests(req, res, next) {

        try {
            let currentUser = req.decoded;
            let userFilter = `ch.sub_merchant_id = ${currentUser.sub_merchant_id}`;

            let filters = req.body.filter;
            if (filters) {
                for (let key in filters) {
                    if (key == 'existing_home_branch') {
                        userFilter += ` AND (sml1.location_name LIKE '%${filters[key]}%' OR sml2.location_name LIKE '%${filters[key]}%')`
                        delete filters[key];
                    } else if (key == 'from_date') {
                        userFilter += ` AND date_format(ch.created_at, '%Y-%m-%d') >= '${filters[key]}' `;
                        delete filters[key];
                    } else if (key == 'to_date') {
                        userFilter += ` AND date_format(ch.created_at, '%Y-%m-%d') <= '${filters[key]}' `;
                        delete filters[key];
                    }
                }
            }

            const params: queryParam = {
                tablesList: ['customer_home_branch_change_log', 'customer_loyalty', 'customer_loyalty', 'customer_loyalty', 'admins', 'admins', 'sub_merchant_locations', 'sub_merchant_locations'],
                tablesAlias: ['ch', 'cl1', 'cl2', 'cl3', 'ad1', 'ad2', 'sml1', 'sml2'],
                tablesColumns: [
                    ['id', 'customer_loyalty_id', 'status', 'created_at', 'updated_at'],
                    ['mobile_number']
                ],
                tablesJoins: [
                    ['id', 'ch.customer_loyalty_id'],
                    ['id', 'ch.created_by'],
                    ['id', 'ch.updated_by'],
                    ['id', 'ch.created_by'],
                    ['id', 'ch.updated_by'],
                    ['id', 'ch.existing_home_branch_id'],
                    ['id', 'ch.new_home_branch_id']
                ],
                tablesColumnsAlias: [
                    `CASE WHEN ch.requested_from = 1 THEN CONCAT_WS(' ',ad1.first_name,ad1.last_name,'(WebPOS)') WHEN ch.requested_from = 2 THEN CONCAT_WS(' ',cl2.first_name,cl2.last_name,'(WebSite)') ELSE '' END AS requested_by_name`,
                    `CASE WHEN ch.changed_from = 1 THEN CONCAT_WS(' ',ad2.first_name,ad2.last_name,'(WebPOS)') WHEN ch.changed_from = 2 THEN CONCAT_WS(' ',cl3.first_name,cl3.last_name,'(WebSite)') ELSE '' END AS updated_by_name`,
                    `sml1.location_name AS old_home_branch`,
                    `sml1.location_name AS existing_home_branch`,
                    `sml2.location_name AS new_home_branch`,
                    `CONCAT_WS(' ', cl1.first_name, cl1.last_name) AS customer_name`
                ],
                tableIndexColumn: 'ch.id',
                userFilter: userFilter,
                ...req.body
            };
            const data = await this.generateQuery(params);
            return this.sendResponse(res, true, 200, data, '');
        } catch (error) {
            return next(error);
        }
    }

    // Search user
    async getCustomer(req, res) {

        merchantCustomersRepository.getCustomers(req, (err, rows) => {
            if (err) {
                this.sendResponse(res, false, 402, req, 'Customer not found');
            }
            else {
                this.sendResponse(res, true, 200, { customerDetails: rows, message: "Customer profile fetched sucessfully" }, '');
            }
        });
    }


    // Get state
    async getState(req, res, next) {
        try {
            let result = await merchantCustomersRepository.getState(req.body);
            return this.sendResponse(res, false, 200, result, '');
        } catch (err) {
            return next(err);
        };
    }

    // Get city by state
    async getCity(req, res, next) {
        try {
            let result = await merchantCustomersRepository.getCity(req.body);
            return this.sendResponse(res, false, 200, result, '');
        } catch (err) {
            return next(err);
        };
    }

    // Get store locations
    async getStoreLocations(req, res, next) {
        try {
            let result = await merchantCustomersRepository.getStoreLocations(req.body);
            if (Object.keys(result.location_list).length) {
                return this.sendResponse(res, true, 200, result, 'Store Locations.');
            } else {
                return this.sendResponse(res, false, 104, {}, 'No record found.');
            }
        } catch (err) {
            return this.sendResponse(res, false, 500, {}, 'Failed to get city.');
        };
    }

    // Change request status for mobile or home branch
    async changeRequestStatus(req, res, next) {
        try {
            const { error, response } = await merchantCustomersRepository.changeRequestStatus(req);
            if (error) {
                return next(error);
            }
            const { statusCode, message, data } = response;
            return this.sendResponse(res, true, statusCode, data, message);
        } catch (err) {
            return next(err);
        }
    }

    // get pending mobile or home branch change request
    async  checkForPendingRequest(req, res, next) {
        try {
            // const { error, response } = await merchantCustomersRepository.checkForPendingRequest(req);
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

    // Get mobile number change log
    //move to customer controller
    async getTransactions(req, res, next) {
        try {
            let userFilter = 'co.processed=1';
            const params: queryParam = {
                tablesList: ['customer_orders'],
                tablesAlias: ['co'],
                tablesColumns: [
                    [
                        'id',
                        'order_number',
                        'order_date',
                        'calculated_amount',
                        'created_by',
                        'updated_by',
                        'order_status',
                        'purchased_from',
                        'store_code',
                        'total_items',
                        'mobile_number'
                    ]
                ],
                tablesJoins: [
                ],
                tablesColumnsAlias: [
                    `CASE WHEN co.order_status = 1 THEN "Ordered" WHEN co.order_status = 3 THEN "Partially" WHEN co.order_status = 4 THEN "Returned" ELSE "-" END AS order_status_text`
                ],
                tableIndexColumn: 'co.id',
                userFilter: userFilter,
                ...req.body
            };
            const data = await this.generateQuery(params);

            return this.sendResponse(res, true, 200, data, '');
        } catch (error) {
            return next(error)
        }
    }

    // Get mobile number change log
    //move to customer controller
    async getOrderDetails(req, res, next) {
        try {
            let result = await merchantCustomersRepository.getOrderDetails(req.body);
            return this.sendResponse(res, true, 200, result, '');
        } catch (err) {
            return next(err);
        };
    }

    async addCustomer(req, res, next) {
        try {
            // const { request_source } = req.body;
            // const validRequestSource = customerRepository.checkRequestSource(request_source);
            const { error, response } = await customerRepository.addOrUpdateCustomer(req);

            if (error) {
                let statusFlag: boolean;
                statusFlag = error.status == 'SUCCESS' ? true : false;
                return this.sendResponse(res, statusFlag, error.statusCode, error, error.message);
            }

            const { statusCode, data, message } = response;

            return this.sendResponse(res, true, statusCode, data, message);
        } catch (error) {
            // console.error('addCustomer', error);
            next(error)
        }

    }

    async getVouchersCoupns(req, res, next) {
        try {
            let userFilter = '';
            // const bodyParams = {...req.body,sortField:'coupon_used'}
            const params: queryParam = {
                tablesList: ['customer_milestones'],
                tablesAlias: ['cm'],
                tablesColumns: [
                    ['id', 'milestone_id', 'voucher_value', 'purchase_value', 'voucher_code', 'date_earned', 'expiry_date', 'coupon_used', 'customer_loyalty_id']
                ],
                tablesJoins: [
                ],
                tableIndexColumn: 'cm.id',
                userFilter: userFilter,
                ...req.body
            };
            const data = await this.generateQuery(params);

            return this.sendResponse(res, true, 200, data, '');
        } catch (error) {
            return next(error);
        }
    }

    //Customer Campaign voucher data
    async getOfferCoupns(req, res, next) {
        try {
            let userFilter = '';
            // const bodyParams = {...req.body,sortField:'coupon_used'}
            const params: queryParam = {
                tablesList: ['merchant_coupons', 'merchant_campaign_reward_values', 'merchant_campaigns'],
                tablesAlias: ['mc', 'mcrv', 'mcm'],
                tablesColumns: [
                    ['id', 'coupon_code AS voucher_code', 'coupon_end_date AS expiry_date', 'coupon_used', 'customer_loyalty_id'],
                    ['reward_type_x_value AS voucher_value', 'reward_type'],
                    ['campaign_title'],
                ],
                tablesJoins: [
                    ['id', 'mc.merchant_campaign_reward_values_id'],
                    ['id', 'mc.merchant_campaigns_id'],
                ],
                tableIndexColumn: 'mc.id',
                userFilter: userFilter,
                ...req.body
            };
            const data = await this.generateQuery(params);

            return this.sendResponse(res, true, 200, data, '');
        } catch (error) {
            return next(error);
        }
    }

    async changeRequestFromCustomer(req, res, next) {
        try {
            const { error, response } = await merchantCustomersRepository.changeRequestFromCustomer(req);

            if (error) {
                return next(error);
            }
            const { statusCode, message, data } = response;
            return this.sendResponse(res, true, statusCode, data, message);
        } catch (error) {
            return next(error);
        }
    }

    async verifyEmail(req, res, next) {
        try {
            // const { error, response } = await merchantCustomersRepository.changeRequestFromCustomer(req);

            jwt.sign(
                {
                    data: {
                        mobile_number: req.body.mobile_number,
                        email_verify_key: req.body.email_verify_key
                    }
                }, Config.AUTHORIZATION_KEY, {
                    expiresIn: '1d'
                }, (err, token) => {
                    if (token) {
                        const verifyUrl = "http://crocs.boomerup.com/verify-email-address/?q=" + token;
                        // console.log("cancelUrl", cancelUrl, "id:", mobileChangeId);
                        let sendData = {
                            toEmail: req.body.email_address,
                            customerName: `${req.body.first_name} ${req.body.last_name}`,
                            link: verifyUrl
                        }
                        let result = this.sendEmail('EMAIL_VERIFICATION', sendData);
                        return this.sendResponse(res, true, 200, result, 'Verification link sent it your registered email address');
                    }

                });
            //let url="http://localhost:4200/verify-email-address/?q="+token;


        } catch (error) {
            return next(error);
        }
    }

    async getCustomerFeedback(req, res, next) {
        try {
            let userFilter = '';
            const userFilterCustom = [];
            let filters = req.body.filter;
            if (filters) {
                for (let key in filters) {
                    if (key == 'from_date') {
                        userFilterCustom.push(`date_format(cf.created_at, '%Y-%m-%d') >= '${filters[key]}'`);
                        delete filters[key];
                    } else if (key == 'to_date') {
                        userFilterCustom.push(`date_format(cf.created_at, '%Y-%m-%d') <= '${filters[key]}'`);
                        delete filters[key];
                    }
                }
                userFilter += userFilterCustom.join(' AND ');
            }

            const params: queryParam = {
                tablesList: ['customer_feedback', 'customer_loyalty'],
                tablesAlias: ['cf', 'cl'],
                tablesColumns: [
                    ['id', 'subject', 'message', 'created_by', 'created_at'],
                    ['first_name', 'last_name', 'mobile_number']
                ],
                tablesJoins: [
                    ['id', 'cf.created_by'],
                ],
                tablesColumnsAlias: [
                    `CONCAT_WS(' ', cl.first_name, cl.last_name) AS customer_name`
                ],
                tableIndexColumn: 'cf.id',
                userFilter: userFilter,
                ...req.body
            };
            const data = await this.generateQuery(params);

            return this.sendResponse(res, true, 200, data, 'Feedback List');
        } catch (error) {
            return next(error);
        }
    }
}

export default MerchantcustomersController;