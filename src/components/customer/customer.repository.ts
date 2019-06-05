import * as bcrypt from 'bcrypt';
import constants from '../../config/constants';
import pool from '../../database/database-connection';
import { User } from '../../model/User';
import BaseController from '../../shared/controller/BaseController';
import { ResultSetHeader } from '../../shared/models/ResultSetHeader.model';
import { SpResponse } from '../../shared/models/SpResponse';
import * as jwt from 'jsonwebtoken';
import Config from '../../config/config';
export default class CustomerRepository {

    filter(object: {}, ...keys) {
        return keys.reduce((result, key) => ({ ...result, [key]: object[key] }), {});
    };

    async callVerifyOtpProcedure(inputs) {
        const spStatus = await pool.query(`CALL verifyOTP (?);`, [inputs]);//.then((result: ResultSetHeader) => result);

        if (Object.keys(spStatus).length !== 2) {
            throw new Error('Procedure Error verifyOTP');
        }

        const selectResut = <SpResponse>spStatus[0][0]['response'];
        const allowStatusCode = [104, 105, 200];

        if (!selectResut.statusCode || selectResut.statusCode === 520) {
            const requiredKey = ['status', 'message', 'statusCode'];
            const response = this.filter(selectResut, ...requiredKey);
            return { error: response };
        }
        return { error: null, response: selectResut };
    }

    async sendOtp(req, callback) {
        try {
            // 201 for login , 202 for change mobile, 203 for change home branch

            const bodyParams = req.body;
            if ('type' in bodyParams) {
                bodyParams['otp_generated_for'] = bodyParams['type'];
                delete bodyParams['type'];
            }
            const inputs = JSON.stringify({
                merchant_id: constants.merchantId,
                platForm: 2,
                otp_generated_for: 201,
                request_for: 'SENDOTP',
                ...bodyParams
            });

            let { error, response } = await this.callVerifyOtpProcedure(inputs);

            if (error) {
                return callback(error);
            }

            if (response.statusCode !== 105) {
                const requiredKey = ['current_otp', 'otp_attempt'];
                response.data = this.filter(response.data, ...requiredKey);
            }

            return callback(null, response);
        } catch (err) {
            return callback(err);
        }

    }

    async reSendOtp(req, callback) {
        try {

            const inputs = JSON.stringify({
                merchant_id: 1,
                platForm: 2,
                otp_generated_for: 201,
                request_for: 'RESENDOTP',
                ...req.body
            });

            let { error, response } = await this.callVerifyOtpProcedure(inputs);

            if (error) {
                return callback(error);
            }

            if (response.statusCode !== 105) {
                const requiredKey = ['otp_attempt'];
                if (response.statusCode !== 101) {
                    requiredKey.push('current_otp');
                }
                response.data = this.filter(response.data, ...requiredKey);
            }

            return callback(null, response);

        } catch (error) {
            return callback(error);
        }
    }

    async verifyOtp(req, callback) {
        try {
            const inputs = JSON.stringify({
                merchant_id: 1,
                platForm: 2,
                otp_generated_for: 201,
                request_for: 'VERIFYOTP',
                ...req.body
            });

            let { error, response } = await this.callVerifyOtpProcedure(inputs);

            if (error) {
                return callback(error);
            }
            // console.log(error, response);

            if (response.statusCode == 104) {
                const requiredKey = ['statusCode', 'otp_attempt'];
                response.data = this.filter(response.data, ...requiredKey);
                return callback(null, response);
            }


            /* const customerRequiredFields = {
                first_name: true,
                last_name: true,
                mobile_number: true,
                email_address: true,
                date_of_birth: true,
                gender: true,
                marital_status: true,
                spouse_dob: false,
                anniversary_date: false
            } */

            const customerRequiredFields = this.customerRequiredFields();
            const responseData = response.data;
            //  console.log('responseData', responseData);

            // const requiredKey = ['first_name', 'last_name', 'mobile_number', 'email_address', 'date_of_birth', 'anniversary_date', 'spouse_dob', 'marital_status', 'gender', 'isRegister', 'otpAttempt'];
            // const response = this.filter(otpResult.data, ...requiredKey);


            //isRegister = 0 - new user, 201 existisng user but profile incomplete
            if (Object.keys(responseData).length > 1) {
                for (let key in customerRequiredFields) {
                    if (customerRequiredFields[key] && !responseData[key]) {

                        if (responseData.isRegister === 1) {
                            response.data.isRegister = 201;
                        } /* else {
                            response.data.isRegister = 0;
                        } */
                    }
                }
                //response.data = responseData;
            }

            // console.log(response);

            return callback(null, response);

        } catch (err) {
            return callback(err);
        }

    }

    getRegisteredCustomer(req, callback) {
        const mobile_number = req.mobile_number; //DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth
        pool.query(`SELECT id,first_name,last_name,mobile_number,email_address,date_of_birth,anniversary_date,spouse_dob,marital_status,gender FROM customer_loyalty WHERE mobile_number='${mobile_number}'`, callback).then(
            (result: any) => callback(result[0])
        );
    }

    async callRegisterCustomerProcedure(userInfo) {
        const spStatus = await pool.query(`CALL registerCustomer(?);`, [userInfo]).then((result: ResultSetHeader) => result);
        if (Object.keys(spStatus).length !== 2) {
            throw new Error('Procedure Error registerCustomer');
        }


        //collect result
        const selectResut = <SpResponse>spStatus[0][0]['response'];
        const allowStatusCode = [104, 102, 108, 200];
        if (!selectResut.statusCode || allowStatusCode.indexOf(selectResut['statusCode']) == -1) {
            const requiredKey = ['status', 'message', 'statusCode'];
            // const response = this.filter(selectResut, ...requiredKey);
            return { error: selectResut };
        }
        return { error: null, response: selectResut };
    }
    async addOrUpdateCustomer(req) {
        try {
            const body = req.body;
            const { request_source } = body;
            const validRequestSource = this.checkRequestSource(request_source);
            if (!validRequestSource) {
                throw new Error('fn(addOrUpdateCustomer) Bad Request Source');// { error: { message: 'Bad Request', statusCode: 400, status: 'FAILURE' } };
            }

            if (validRequestSource.action === 'insert' && body.email_address) {
                body['email_verify_key'] = bcrypt.hashSync(body.email_address, 10);
            }

            // const { error, result } = await this.checkUserStatus(userInfo);

            let defaultInputs = {
                merchant_id: constants.merchantId,
                loyalty_id: constants.merchantId,
                registered_from: 2,
            };

            if (req.decoded) {
                const currentUser = <User>req.decoded;
                if (!('user_type_id' in currentUser)) {
                    throw new Error('fn(addOrUpdateCustomer) user type missing');
                }

                const createrInfo = {
                    created_by: currentUser.user_id,
                    updated_by: currentUser.user_id,
                    sub_merchant_id: currentUser.sub_merchant_id,
                    registered_location: currentUser.sub_merchant_location_id
                };

                if (currentUser.isMerchant) {
                    const merchantInfo = { registered_from: 1, mobile_verified: 1 };
                    defaultInputs = { ...defaultInputs, ...merchantInfo };
                }

                if (request_source === 0) { //at create user
                    delete createrInfo['updated_by'];
                } else { // at update user
                    delete createrInfo['created_by'];
                    delete defaultInputs['registered_from'];
                    delete createrInfo['sub_merchant_id'];
                    delete createrInfo['registered_location'];
                    // delete defaultInputs['mobile_verified'];
                }

                defaultInputs = { ...defaultInputs, ...createrInfo };
            }

            /* const inputs = {
                ...defaultInputs,
                ...body
            }; */
            /* Object.assign(inputs, {
                ...defaultInputs,
                ...body
            }) */
            const params = JSON.stringify({
                ...defaultInputs,
                ...body
            });

            /*  console.log(params);
             return; */
            let { error, response } = await this.callRegisterCustomerProcedure(params);

            if (error) {
                return { error: error };
            }

            // apply campaign on register user
            if (request_source == 0 && response.statusCode == 200) {
                await this.profileAlert(response);
                response = await this.verifyEmail(response);
                response = await this.sendCampaignCommunication(response);
                response = await this.checkMileStone(response);
            }

            // apply campaign on update user profile
            /*  if (request_source == 201) {
                 response = await this.checkMileStone(response);
             }
  */
            return { error: null, response };
        } catch (error) {
            throw error;
        }
    }

    async verifyEmail(response: SpResponse): Promise<SpResponse> {
        try {
            const baseCtrl = new BaseController();
            const responseData = response.data;

            jwt.sign(
                {
                    data: {
                        mobile_number: responseData.mobile_number,
                        email_verify_key: responseData.email_verify_key
                    }
                }, Config.AUTHORIZATION_KEY, {
                    expiresIn: '1d'
                }, async (err, token) => {
                    if (token) {
                        var cancelUrl = "http://crocs.boomerup.com/verify-email-address/?q=" + token;
                        let sendData = {
                            toEmail: responseData.email_address,
                            customerName: `${responseData.first_name} ${responseData.last_name}`,
                            link: cancelUrl
                        }
                        await baseCtrl.sendEmail('EMAIL_VERIFICATION', sendData);
                        // return baseCtrl.sendResponse(res, true, 200, result, 'Verification link sent it your registered email address');
                    }

                });
            return response;
        } catch (error) {
            return error;
        }
    }

    async sendCampaignCommunication(response: SpResponse): Promise<SpResponse> {
        try {
            const baseCtrl = new BaseController();
            const responseData = response.data;
            //send welcome coupon code if generated
            if ('campaign_response' in responseData) {
                if (responseData.campaign_response.status == 'SUCCESS' && responseData.campaign_response.statusCode == 200) {
                    const customerName = `${responseData.first_name} ${responseData.last_name}`;
                    const subMerchantId = (responseData.sub_merchant_id == null) ? 0 : responseData.sub_merchant_id;
                    let campaignTitle = responseData.campaign_response.data.campaignTitle;
                    campaignTitle = campaignTitle.replace(' ', '_');
                    const emailTag = `${campaignTitle}_${responseData.campaign_response.data.campaignId}_${subMerchantId}`;
                    const customerCampaignData = { "email_type": 1, "email_tag": emailTag, "toEmail": responseData.email_address, "mobile_number": responseData.mobile_number, "voucherCode": responseData.campaign_response.data.couponCode, "voucherValue": responseData.campaign_response.data.couponValue, "voucherValidity": baseCtrl.getCriteriaDate(new Date(responseData.campaign_response.data.couponValidity)), "customerName": customerName };
                    setTimeout(async () => {
                        // send sms
                        if (responseData.mobile_number != '' && responseData.mobile_verified == 1 && responseData.opt_out_from_sms_status == 0) {
                            await baseCtrl.sendSMS('WELCOME_CAMPAIGN', customerCampaignData);
                        }

                        //send email
                        /* if (responseData.email_address != '' && responseData.email_verified == 1 && responseData.opt_out_from_email_status == 0) {
                          await  baseCtrl.sendEmail('WELCOME_CAMPAIGN', customerCampaignData);
                        } */
                    }, 5000);
                }

                delete responseData['campaign_response'];
            }

            return response;
        } catch (error) {
            throw error;
        }
    }

    async checkMileStone(response: SpResponse): Promise<SpResponse> {
        try {
            const baseCtrl = new BaseController();
            const responseData = response.data;

            // after update profile for non loyalty user
            if ('user_loyalty_data' in responseData && 'statusCode' in responseData.user_loyalty_data && responseData.user_loyalty_data.statusCode == 200) {
                let userLoyaltyData = responseData.user_loyalty_data.data;
                for (let customer of userLoyaltyData) {
                    if (customer.message_type == 0) {
                        setTimeout(async () => {
                            const customerData = { "toEmail": customer.email_address, "mobile_number": customer.mobile_number, "voucherCode": customer.coupon_code, "voucherValue": customer.voucher_value, "voucherValidity": baseCtrl.getCriteriaDate(new Date(customer.coupon_validity)), "customerName": customer.first_name };
                            // send sms
                            if (customer.mobile_number != '' && customer.mobile_verified == 1 && customer.opt_out_from_sms_status == 0) {
                                await baseCtrl.sendSMS('MILESTONE_' + customer.milestoneNo, customerData);
                            }
                        }, 5000);
                    }
                }

                delete responseData['user_loyalty_data'];
            }
            return response;
        } catch (error) {
            throw error;
        }
    }
    async callUserStatusProcedure(userInfo) {
        return pool.query(`CALL checkUserStatus(?, @response);`, [userInfo]).then((result: ResultSetHeader) => result);;
    }

    async checkUserStatus(userInfo) {
        try {
            const inputs = JSON.stringify({
                merchant_id: 1,
                ...userInfo
            });

            const procedureResult = await this.callUserStatusProcedure(inputs);
            // console.log('procedureResult', procedureResult);

            /* if (procedureResult.affectedRows !== 1) {
                throw new Error('Failed to fecth');
                return;
            } */

            const selectResutArray = await pool.query(`SELECT @response as response;`, null);

            if (Object.keys(selectResutArray).length < 1) {
                throw new Error('Procedure Error checkUserStatus');
            }

            //collect result
            const selectResut = <SpResponse>JSON.parse(selectResutArray[0]['response']);
            const allowStatusCode = [104, 200];

            if (!selectResut.statusCode || allowStatusCode.indexOf(selectResut['statusCode']) == -1) {
                const requiredKey = ['status', 'message', 'statusCode'];
                const response = this.filter(selectResut, ...requiredKey);
                return { error: response };
            }

            if (selectResut['statusCode'] == 104) {
                return { error: null, result: null };
            }

            const requiredKey = ['first_name', 'last_name', 'email_address', 'date_of_birth', 'anniversary_date', 'spouse_dob', 'marital_status', 'gender'];
            const response = this.filter(selectResut.data, ...requiredKey);
            return { error: null, result: response };
        } catch (err) {
            throw err;
        }
    }


    async getCustomers(req, callback: any) {
        try {
            let customerObject = {
                customerDetails: null,
                milestoneDetails: null
            }
            customerObject.customerDetails = await pool.query(`SELECT c.id,c.first_name,c.last_name,c.mobile_number,c.gender,c.mobile_verified, c.email_address,c.email_verified,c.merchant_id,c.sub_merchant_id,c.status,c.date_of_birth,c.marital_status,c.anniversary_date,c.spouse_dob,c.home_branch_id,ct.name as city FROM customer_loyalty c LEFT JOIN cities ct ON ct.id = c.city_id WHERE c.mobile_number='${req.searchString}' OR (CONCAT(c.first_name,' ',c.last_name) ='${req.searchString}' AND c.mobile_number='${req.mobile_number}')`, null);
            customerObject.milestoneDetails = await pool.query('CALL getCustomerDashboardDetails(?)', [customerObject.customerDetails[0].mobile_number]);
            // console.log(customerObject.customerDetails);
            // console.log(customerObject.milestoneDetails);

            return callback(null, customerObject);
        } catch (error) {
            return callback({ message: error.mesage })
        }
    }

    async updateCoupons(req) {
        try {
            const body = req.body;
            let result = await pool.query(`UPDATE customer_milestones SET coupon_used='2' WHERE id=?;`, [body.id]);
            return result;
        } catch (error) {
            return error;
        }
    }

    //send verification link on old mobile number
    static sendVerificationLink(req, callback): void {
        pool.query(`SELECT mobile_number, merchant_id FROM customer_loyalty WHERE mobile_number ='${req.mobile_number}' AND merchant_id ='${req.merchant_id}'`, callback).then(
            (result: any) => callback(result[0])
        );
    }

    //Verify customer email
    async callverifyEmailAddressSp(input) {
        const spStatus = await pool.query(`CALL verifyEmailAddress(?);`, [input]).then((result: ResultSetHeader) => result);;
        if (Object.keys(spStatus).length !== 2) {
            throw new Error('Procedure Error callverifyEmailAddressSp');
        }
        <SpResponse>spStatus[0][0]['response'];

        //collect result
        const selectResut = <SpResponse>spStatus[0][0]['response'];
        const allowStatusCode = [200, 104, 105];
        if (!selectResut.statusCode || allowStatusCode.indexOf(selectResut['statusCode']) == -1) {
            const requiredKey = ['status', 'message', 'statusCode'];
            const response = this.filter(selectResut, ...requiredKey);
            return { error: response };
        }
        return { error: null, response: selectResut };
    }

    //fetch data rerquired for customer dashboard
    async callgetCustomerDashboardDetailsSp(input) {
        const spStatus = await pool.query(`CALL getCustomerDashboardDetails(?);`, input).then((result: ResultSetHeader) => result);;
        if (Object.keys(spStatus).length !== 2) {
            throw new Error('Procedure Error getCustomerDashboardDetails');
        }

        //collect result
        const selectResut = <SpResponse>spStatus[0][0]['response'];
        if (!selectResut) {
            throw new Error('Procedure getCustomerDashboardDetails response empty');
        }

        const allowStatusCode = [200, 104];
        if (!selectResut.statusCode || selectResut.statusCode > 200) {
            const requiredKey = ['status', 'message', 'statusCode'];
            const response = this.filter(selectResut, ...requiredKey);
            return { error: response };
        }
        return { error: null, response: selectResut };
    }

    // fetch customer crocs feed
    async callgetCustomerCrocsFeedSp(input) {
        const spStatus = await pool.query(`CALL getCustomerCrocsFeed(?);`, input).then((result: ResultSetHeader) => result);;
        if (Object.keys(spStatus).length !== 2) {
            throw new Error('Procedure Error callgetCustomerCrocsFeedSp');
        }

        //collect result
        const selectResut = <SpResponse>spStatus[0][0]['response'];
        if (!selectResut) {
            throw new Error('Procedure callgetCustomerCrocsFeedSp response empty');
        }

        const allowStatusCode = [200, 104];
        if (!selectResut.statusCode || selectResut.statusCode > 200) {
            const requiredKey = ['status', 'message', 'statusCode'];
            const response = this.filter(selectResut, ...requiredKey);
            return { error: response };
        }
        return { error: null, response: selectResut };
    }

    // fetch customer crocs feed
    async callgetCustomerCouponsVoucherSp(input) {
        const spStatus = await pool.query(`CALL getCustomerCoupons(?);`, input).then((result: ResultSetHeader) => result);;
        if (Object.keys(spStatus).length !== 2) {
            throw new Error('Procedure Error getCustomerCoupons');
        }

        //collect result
        const selectResut = <SpResponse>spStatus[0][0]['response'];
        if (!selectResut) {
            throw new Error('Procedure getCustomerCoupons response empty');
        }

        const allowStatusCode = [200, 104];
        if (!selectResut.statusCode || selectResut.statusCode > 200) {
            const requiredKey = ['status', 'message', 'statusCode'];
            const response = this.filter(selectResut, ...requiredKey);
            return { error: response };
        }
        return { error: null, response: selectResut };
    }
    // fetch customer search data for pos and sub-merchant
    async callgetCustomerSearchDataSp(input) {
        const spStatus = await pool.query(`CALL getCustomerSearchData(?);`, input).then((result: ResultSetHeader) => result);

        if (Object.keys(spStatus).length !== 2) {
            throw new Error('Procedure Error getCustomerSearchData');
        }

        //collect result
        const selectResut = <SpResponse>spStatus[0][0]['response'];
        if (!selectResut) {
            throw new Error('Procedure getCustomerSearchData response empty');
        }

        //    const allowStatusCode = [200, 104];
        if (!selectResut.statusCode || selectResut.statusCode > 200) {
            const requiredKey = ['status', 'message', 'statusCode'];
            const response = this.filter(selectResut, ...requiredKey);
            return { error: response };
        }
        return { error: null, response: selectResut };
    }
    // Customer details
    static getCustomersSuggestion(req, callback): void {
        const searchString = req.body.searchString;

        pool.query(`SELECT first_name,IFNULL(last_name,'') AS last_name , mobile_number FROM customer_loyalty WHERE first_name LIKE ? OR CONCAT(first_name,' ',last_name) LIKE ? OR last_name LIKE ? `, [`${searchString}%`, `${searchString}%`, `${searchString}%`]).then(
            (result: any) => callback(null, result)
        );
    }

    static checkMobileNumber(req, callback): void {
        // console.log(req.decoded.merchant_id);

        const mobile_number = req.body.mobile_number;
        const merchant_id = req.decoded.merchant_id
        pool.query(`SELECT mobile_number, merchant_id FROM customer_loyalty WHERE mobile_number =? AND merchant_id =?`, [mobile_number, merchant_id]).then(result => callback(null, result[0]));
    }

    getAllActions() {
        return [{ requestSource: 0, action: 'insert' }, { requestSource: 201, action: 'update' }, { requestSource: 1, action: 'update' }];
    }

    getAction(key: string, value: any) {
        const actionKeys = ['requestSource', 'action'];
        if (actionKeys.indexOf(key) === -1) {
            return null;
        }
        return this.getAllActions().find(act => act[key] === value);
    }

    isOneRecordResult(result: ResultSetHeader, action: string): boolean {

        if (!action) {
            throw new Error('Please provide action');
        }

        if (!this.isValidAction(action)) {
            throw new Error('Invalid action');
        }

        if (action == 'update') {
            return result.affectedRows === 1 && (result.changedRows === 1 || result.changedRows == 0);
        } else {
            return result.affectedRows === 1 && result.insertId !== 0;
        }
    }

    isValidAction(action: string) {
        return this.getAction('action', action);
    }

    checkRequestSource(requestSource: number) {

        if (requestSource == null) {
            throw new Error('Please provide request source.');
        }

        if (!this.isNumber(requestSource)) {
            throw new Error('Invaid request source.');
        }

        return this.getAction('requestSource', requestSource) || null;
    }
    isNumber(n: any) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    async getVoucherDetails(customer_loyalty_id) {
        try {
            let result = await pool.query('SELECT * FROM merchant_loyalty_program_milestones mlpm LEFT JOIN customer_milestones cm ON mlpm.id = cm.milestone_id AND cm.customer_loyalty_id = ?', [customer_loyalty_id]);
            return { voucher_details: result };
        } catch (error) {
            throw error;
        }
    }

    async searchCustomer(req): Promise<{ error: any; response: SpResponse; }> {
        try {
            const params = req.body;
            const requestParam = {
                merchant_id: constants.merchantId,
                ...params
            };
            if ('search_by_value' in params) {
                Object.assign(requestParam, { mobile_number: params.search_by_value })
            }

            const inputs = JSON.stringify(requestParam);
            const { error, response } = await this.callgetCustomerSearchDataSp(inputs);

            if (error) {
                throw error;
            }
            return { error: null, response };

        } catch (error) {
            throw error;
        }
    }

    async callGetStoreLocations(searchKey) {

        const spStatus = await pool.query(`CALL getStoreLocations(?);`, [searchKey]).then((result: ResultSetHeader) => result);
        if (Object.keys(spStatus).length !== 2) {
            throw new Error('Procedure Error getStoreLocations');
        }
        //collect result
        const selectResut = spStatus[0][0]['response'];
        return { error: null, response: JSON.parse(selectResut) };
    }

    customerRequiredFields() {
        return {
            first_name: true,
            last_name: true,
            mobile_number: true,
            email_address: true,
            date_of_birth: true,
            gender: true,
            marital_status: true,
            spouse_dob: false,
            anniversary_date: false
        };
    }

    isProfileCompleted(response: SpResponse) {
        const customerRequiredFields = this.customerRequiredFields();
        let isCompleted: boolean = true;
        const responseData = response.data;
        if (Object.keys(responseData).length > 1) {
            for (let key in customerRequiredFields) {
                if (customerRequiredFields[key] && !responseData[key]) {
                    isCompleted = false;
                }
            }
        }
        return isCompleted;
    }

    async profileAlert(response: SpResponse) {
        const baseCtrl = new BaseController();
        const user = <User>response.data;
        let smsTemplate = 'FULL_REGISTRATION';
        let smsTemplateData = { customerName: user.first_name + ' ' + user.last_name, loginLink: constants.webURL };
        if (!this.isProfileCompleted(response)) {
            smsTemplate = 'PARTIAL_REGISTRATION';
            smsTemplateData['termsLink'] = constants.termsLink;
        }
        await baseCtrl.sendSMS(smsTemplate, smsTemplateData);
    }

    //store customer feedback
    async customerFeedback(input) {
        const response = await pool.query(`INSERT INTO customer_feedback (subject,message,created_by)
        VALUES (?,?,?);`, [input.body.subject, input.body.message, input.decoded.user_id]).then((result: ResultSetHeader) => result);
        if (response.affectedRows > 0) {
            return { error: null, response: response };
        }
        return { error: true, response: null };
    }

    // Get customer registration report snapshot or summary
    async getSnapshot(currentUser) {
        try {
            let result = await pool.query(`SELECT COUNT(cl.id) AS total, IFNULL(ROUND(SUM(cl.current_purchase_value), 2), 0) AS total_purchase, IFNULL(ROUND(AVG(cl.current_purchase_value), 2), 0) AS avg_purchase, MAX(cl.current_purchase_value) AS max_purchase
            FROM customer_loyalty cl
            WHERE cl.merchant_id = ? AND (cl.sub_merchant_id = ? OR cl.sub_merchant_id IS NULL) AND cl.is_loyalty_user = ?`, [currentUser.merchant_id, currentUser.sub_merchant_id, 1]);
            if (result) {
                return result[0];
            } else {
                return '';
            }
        } catch (error) {
            throw error;
        }
    }
    // get milestone mail data
    async getMilestoneMailData(params) {
        try {
            params = JSON.parse(params);
            let result = await pool.query(`SELECT * FROM send_user_loyalty_communication WHERE mobile_number = ? AND processed = ? AND is_from_register = ?`, [params.mobile_number, 0, 1]);
            if (result) {
                return result;
            } else {
                return '';
            }
        } catch (error) {
            throw error;
        }
    }
    // delete the record on mail sent
    async deleteMilestoneMailData(params) {
        try {
            params = JSON.parse(params);
            let result = await pool.query(`DELETE FROM send_user_loyalty_communication WHERE WHERE mobile_number = ? AND processed = ? AND is_from_register = ?`, [params.mobile_number, 0, 1]);
            if (result) {
                return result;
            } else {
                return '';
            }
        } catch (error) {
            throw error;
        }
    }
}
