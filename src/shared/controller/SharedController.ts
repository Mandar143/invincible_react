import BaseController from '../../shared/controller/BaseController';
import MerchantcustomersRepository from '../../components/merchant-customers/merchant-customers.repository';
import CustomerRepository from '../../components/customer/customer.repository';
import SharedRepository from '../../repository/shared.repository';
const customerRepository = new CustomerRepository();
const sharedRepository = new SharedRepository();

class SharedController extends BaseController {

    // Change request status for mobile or home branch
    async changeRequestStatus(reqBody, res, next) {
        let requestParams = reqBody.body;
        requestParams["updated_by"] = reqBody.body.customer_loyalty_id;
        try {
            /*  merchantCustomersRepository.changeRequestStatus(requestParams, (error, result) => {
                 if (error) {
                     return next(error);
                 }
                 if (result.affectedRows) {
                     return this.sendResponse(res, true, 200, {}, 'Request status updated successfully.');
                 } else {
                     return this.sendResponse(res, false, 520, {}, 'Failed to update request status.');
                 }
             }); */
        } catch (err) {
            return next(err);
        }
    }


    // Verify Email Address


    // get customer dashboard data
    async verifyEmailAddress(req, res, next) {
        try {
            const input = JSON.stringify({ email_verify_key: req.body.email_verify_key, mobile_number: req.body.mobile_number });
            const { error, response } = await customerRepository.callverifyEmailAddressSp(input);
            if (error) {
                return next(error);
            }
            // send welcome and milestone achievement email
            if (response.statusCode == 200) {
                const result = await this.sendEmail('WELCOME', response.data);
                const milestoneMailData = await customerRepository.getMilestoneMailData(input);
                if (milestoneMailData.length > 0) {
                    for (let customer of milestoneMailData) {
                        //send email
                        const customerData = { "toEmail": customer.email_address, "mobile_number": customer.mobile_number, "voucherCode": customer.coupon_code, "voucherValue": customer.voucher_value, "voucherValidity": this.getCriteriaDate(new Date(customer.coupon_validity)), "customerName": customer.first_name };
                        if (customer.email_address != '') {
                            const mailResult = await this.sendEmail(`MILESTONE_${customer.milestone_no}_REACHED`, customerData);
                        }
                    }
                    await customerRepository.deleteMilestoneMailData(input);
                }
                response.data = {};
            }
            return this.sendResponse(res, true, 200, response.data, response.message);
        } catch (error) {
            return next(error);
        };
    }

    async getStaticPages(req, res, next) {
        try {
            const input = {
                'page_name': req.body.page_name
            }
            const result = await sharedRepository.getStaticPage(input);
            return this.sendResponse(res, true, 200, result, 'Get Static Pages');
        } catch (error) {
            return next(error);
        };
    }
    async optOut(req, res, next) {
        try {
            const input = {
                'email_address': req.body.email_address,
                'mobile_number': req.body.mobile_number,
                'type': req.body.type
            }
            const result = await sharedRepository.optOut(input);
            if (result.optOutMobileUpdate) {
                for (let element of result.optOutMobileUpdate) {
                    const data = Object.assign({ "type": 1 }, element)
                    const token = await this.generateToken(data);
                    const optInLink = await this.shortURL("http://crocs.boomerup.com/otp-in/?q=" + token);
                    const dataObj = {
                        customerName: `${element.first_name} ${element.last_name}`,
                        mobile_number: element.mobile_number,
                        optInLink: optInLink
                    }
                    const result = await this.sendSMS('OPT_IN', dataObj);
                }
                return this.sendResponse(res, true, 200, { result }, 'Mobile successfully subscribe!');
            }
            if (result.optOutEmailUpdate) {
                console.log(result.optOutEmailUpdate);

                for (let element of result.optOutEmailUpdate) {
                    const data = Object.assign({ "type": 2 }, element)
                    const token = await this.generateToken(data);
                    const optInLink = await this.shortURL("http://crocs.boomerup.com/otp-in/?q=" + token);
                    const dataObj = {
                        customerName: `${element.first_name} ${element.last_name}`,
                        mobile_number: element.mobile_number,
                        toEmail: element.email_address,
                        optInLink: optInLink
                    }
                    const result = await this.sendEmail('OPT_IN', dataObj);
                }
                return this.sendResponse(res, true, 200, { result }, 'Mobile successfully subscribe!');
            }

        } catch (error) {
            return next(error);
        };
    }
    async optIn(req, res, next) {
        try {
            const input = {
                'email_address': req.body.email_address,
                'mobile_number': req.body.mobile_number,
                'type': req.body.type
            }
            const result = await sharedRepository.optIn(input);
            if (result.optOutMobileUpdate) {
                for (let element of result.optOutMobileUpdate) {
                    const dataObj = {
                        customerName: `${element.first_name} ${element.last_name}`,
                        mobile_number: element.mobile_number,
                        email_address: element.email_address,
                    }
                    const result = await this.sendSMS('OPT_THANK_YOU', dataObj);
                }
            }
            if (result.optOutEmailUpdate) {
                for (let element of result.optOutEmailUpdate) {
                    const dataObj = {
                        customerName: `${element.first_name} ${element.last_name}`,
                        mobile_number: element.mobile_number,
                        toEmail: element.email_address,
                    }
                    const result = await this.sendEmail('OPT_THANK_YOU', dataObj);
                }
                return this.sendResponse(res, true, 200, result, 'Email successfully unsubscribe!');
            }
        } catch (error) {
            return next(error);
        };
    }
    // get pindoces
    async  getPinCodes(req, res, next) {
        try {
            let searchKey = req.body.pinCode;
            let { error, response } = await sharedRepository.getPinCodes(searchKey);
            return this.sendResponse(res, true, 200, response, 'Pin Codes');
        } catch (error) {
            throw error;
        }
    }
    // getCities
    async getAllCities(req, res, next) {
        try {

            let searchKey = (req.body.city_name) ? req.body.city_name : '';

            let { error, response } = await sharedRepository.getAllCities(searchKey);
            return this.sendResponse(res, true, 200, response, 'Cities');
        } catch (error) {
            throw error;
        }
    }
}

export default SharedController;