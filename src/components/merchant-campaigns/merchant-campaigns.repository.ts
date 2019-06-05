import pool from '../../database/database-connection';
import BaseController from '../../shared/controller/BaseController';
import { ResultSetHeader } from '../../shared/models/ResultSetHeader.model';
import { SpResponse } from '../../shared/models/SpResponse';
import { isNull } from 'util';

const baseCtrl = new BaseController();

export default class MerchantCampaignsRepository {

    async campaignReportROI(item) {
        try {
            const currentUser = item.decoded;
            const subMerchantId = currentUser.sub_merchant_id;
            const startDate = item.body.filter.from_date;
            const endDate = item.body.filter.to_date;
            const welcomeRequest = JSON.stringify({ "campaign_id": 5, "start_date": startDate, "end_date": endDate, "sub_merchant_id": subMerchantId });
            const birthdayRequest = JSON.stringify({ "campaign_id": 11, "start_date": startDate, "end_date": endDate, "sub_merchant_id": subMerchantId });
            const birthdayROI = await pool.query('CALL getCampaignReportROI(?);', [birthdayRequest]).then((result: ResultSetHeader) => result);

            if (birthdayROI.length !== 2) {
                throw new Error('Procedure Error getCampaignReportROI (birthdayROI)');
            }
            const birthdayData = <SpResponse>birthdayROI[0][0].response;

            const welcomeROI = await pool.query('CALL getCampaignReportROI(?)', [welcomeRequest]).then((result: ResultSetHeader) => result);

            if (welcomeROI.length !== 2) {
                throw new Error('Procedure Error getCampaignReportROI (welcomeROI)');
            }
            const welcomeData = <SpResponse>welcomeROI[0][0].response;

            let result = [];
            if (birthdayData.status == 'SUCCESS' && birthdayData.statusCode == 200) {
                result.push(birthdayData.data);
            }
            if (welcomeData.status == 'SUCCESS' && welcomeData.statusCode == 200) {
                result.push(welcomeData.data);
            }
            return { items: result, total: result.length };
        } catch (error) {
            throw error;
        }
    }

    async birthdayCampaign() {
        try {
            const inputData = JSON.stringify({ "campaign_id": 11 });
            let birthdayResponse = await pool.query('CALL customersEligibleForBdayAnnCampaign(?)', [inputData]).then((result: ResultSetHeader) => result);
            birthdayResponse = birthdayResponse[0][0].response;

            if (Object.keys(birthdayResponse).length > 0 && birthdayResponse.status == 'SUCCESS' && birthdayResponse.statusCode == '200') {
                const birthdayData = birthdayResponse.data;
                const campaignData = birthdayData.campaign_data;
                const customerData = birthdayData.customer_data;

                let customerLoyaltyId = 0, custMerchantId = 0, custLoyaltyId = 0, custSubMerchantId = 0, testControl = 0;
                for (let key in customerData) {
                    customerLoyaltyId = customerData[key].cl_id;
                    custMerchantId = customerData[key].cl_merchant_id;
                    custLoyaltyId = customerData[key].cl_loyalty_id;
                    custSubMerchantId = (customerData[key].cl_sub_merchant_id == null) ? 0 : customerData[key].cl_sub_merchant_id;
                    testControl = customerData[key].test_control;

                    if (customerLoyaltyId > 0 && custMerchantId > 0 && custLoyaltyId > 0) {
                        const request = JSON.stringify({ "campaign_category_id": 4, "merchant_id": custMerchantId, "loyalty_id": custLoyaltyId, "customer_loyalty_id": customerLoyaltyId, "cust_test_or_control": testControl });
                        const checkCampaignAvailability = await pool.query('CALL checkCampaignAvailability(?, @response)', request);
                        let campaignResponse = await pool.query(`SELECT @response as response`, null);
                        campaignResponse = <SpResponse>JSON.parse(campaignResponse[0].response);

                        if (campaignResponse !== null) {
                            //if campaign executed successfully and coupon assigned to customer
                            if (campaignResponse.status == 'SUCCESS' && campaignResponse.statusCode == 200) {
                                const customerName = customerData[key].cl_name;
                                let campaignTitle = campaignResponse.data.campaignTitle;
                                campaignTitle = campaignTitle.replace(' ', '_');
                                const emailTag = `${campaignTitle}_${campaignResponse.data.campaignId}_${custSubMerchantId}`;
                                const customerBirthdayData = { "email_type": 1, "email_tag": emailTag, "toEmail": customerData[key].email_address, "mobile_number": customerData[key].mobile_number, "voucherCode": campaignResponse.data.couponCode, "voucherValue": campaignResponse.data.couponValue, "voucherValidity": baseCtrl.getCriteriaDate(new Date(campaignResponse.data.couponValidity)), "customerName": customerName };
                                // send sms
                                if (customerData[key].mobile_number != '' && customerData[key].mobile_verified == 1 && customerData[key].opt_out_from_sms_status == 0) {
                                    await baseCtrl.sendSMS('BIRTHDAY_CAMPAIGN', customerBirthdayData);
                                }

                                //send email
                                if (customerData[key].email_address != '' && customerData[key].email_verified == 1 && customerData[key].opt_out_from_email_status == 0) {
                                    await baseCtrl.sendEmail('BIRTHDAY_CAMPAIGN', customerBirthdayData);
                                }
                                const usedCouponPercentage = campaignResponse.data.usedCouponPercentage;

                                if (usedCouponPercentage > 50) {
                                    console.log("Exceeded", usedCouponPercentage);
                                }

                            } else {
                                // console.log('Failure: ', campaignResponse);
                                if (campaignResponse.status == 'FAILURE' && (campaignResponse.statusCode == 101 || campaignResponse.statusCode == 103)) {
                                    // break, coupon is out of stock or campaign is not present
                                    break;
                                } else {
                                    // failure with continue
                                }
                            }
                        }
                    }

                }
                return true;
            } else {
                // console.log('No record found');
                return false;
            }
        } catch (error) {
            throw error;
        }
    }

    async birthdayCampaignBkp() {
        try {
            const { error, response } = await pool.query('CALL customersEligibleForBdayAnnCampaign(?)', [11]);
            const bdayCustomersList = response[0];
            let request = {};
            let customerLoyaltyId = 0, custMerchantId = 0, custLoyaltyId = 0;
            if (bdayCustomersList.length) {
                /* const isTestControl = bdayCustomersList[0].is_test_control;
                const campaignTestPercentage = bdayCustomersList[0].campaign_test;
                const campaignControlPercentage = bdayCustomersList[0].campaign_control;
                const bdayCustomersListLength = bdayCustomersList.length; */
                let campaignTest = 0, loopCount = 0, testControl = 0;

                // if test control is set
                /* if (isTestControl) {
                    campaignTest = Math.floor((campaignTestPercentage * bdayCustomersListLength) / 100);
                } */

                for (let key in bdayCustomersList) {
                    customerLoyaltyId = bdayCustomersList[key].cl_id;
                    custMerchantId = bdayCustomersList[key].cl_merchant_id;
                    custLoyaltyId = bdayCustomersList[key].cl_loyalty_id;
                    testControl = bdayCustomersList[key].test_control;
                    if (customerLoyaltyId > 0 && custMerchantId > 0 && custLoyaltyId > 0) {

                        // if test control is set
                        /* if (isTestControl && loopCount < campaignTest) {
                            testControl = 1;
                        } else if (isTestControl) {
                            testControl = 2;
                        } */

                        request = JSON.stringify({ "campaign_category_id": 4, "merchant_id": custMerchantId, "loyalty_id": custLoyaltyId, "customer_loyalty_id": customerLoyaltyId, "cust_test_or_control": testControl });
                        const checkCampaignAvailability = await pool.query('CALL checkCampaignAvailability(?, @response)', request);
                        const { error, response } = await pool.query(`SELECT @response as response`, null);
                        const campaignResponse = <SpResponse>JSON.parse(response[0].response);

                        if (campaignResponse !== null) {
                            //if campaign executed successfully and coupon assigned to customer
                            if (campaignResponse.status == 'SUCCESS' && campaignResponse.statusCode == 200) {
                                const customerName = bdayCustomersList[key].cl_name;
                                // send sms
                                if (bdayCustomersList[key].mobile_number != '') {
                                    const message = `Hi ${customerName}, Your birthday coupon code is ${campaignResponse.data.couponCode} with validity ${campaignResponse.data.couponValidity}.`;
                                    const response = await baseCtrl.sendSMS(bdayCustomersList[key].mobile_number, message);
                                    // console.log("SMS Response", response);
                                }

                                //send email
                                if (bdayCustomersList[key].email_address != '') {
                                    const to = bdayCustomersList[key].email_address;
                                    let sendObj = {
                                        "toEmail": bdayCustomersList[key].email_address,
                                        "coupanCode": campaignResponse.data.couponCode,
                                        "coupanValidity": campaignResponse.data.couponValidity
                                    }
                                    let emailTempalte = `<p>Hello, ${customerName}</p><p><label>Coupon Code: </label> ${campaignResponse.data.couponCode} </p><p><label>Coupon Validity: </label> ${campaignResponse.data.couponValidity}</p>`;
                                    baseCtrl.sendEmail('LP_BIRTHDAY_WISH', sendObj);
                                }
                                const usedCouponPercentage = campaignResponse.data.usedCouponPercentage;

                                if (usedCouponPercentage > 50) {
                                    console.log("Exceeded", usedCouponPercentage);
                                }

                            } else {
                                // console.log('Failure: ', campaignResponse);
                                if (campaignResponse.status == 'FAILURE' && (campaignResponse.statusCode == 101 || campaignResponse.statusCode == 103)) {
                                    // break, coupon is out of stock or campaign is not present
                                    break;
                                } else {
                                    // failure with continue
                                }
                            }
                        }
                    } else {
                        // log customerLoyaltyId or custMerchantId or custLoyaltyId is 0
                    }
                    loopCount++;
                }
                return true;
            } else {
                // console.log('No record found');
                return false;
            }
            return true;
        } catch (error) {
            throw error;
        }
    }
}