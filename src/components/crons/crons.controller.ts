// import kue from 'kue';
import * as cron from 'node-cron';
import BaseController from '../../shared/controller/BaseController';
import CronRepository from './cron.repository';
import PaymentController from '../imports/controllers/payment.import.controller';
import { VoucherController } from '../imports/controllers/voucher.import.controller';
import { TransactionController } from '../imports/controllers/transaction.import.controller';
const cronRepository = new CronRepository();

export class CronsController extends BaseController {
    voucherResponse: any;
    str: string = "";
    async runAllCrons() {
        try {

            // // cron.schedule("* * * * * *", async () => {
            //     const { error, response } = await mobilenumberCronRepository.callMobileNumberChange();
            //     if(response){
            //         console.log(response);
            //         let dataObj={
            //             'new_mobile_number':response.newMobileNumber
            //         };
            //         let smsSent :any = this.sendSMS('IN_CHANGE_NUMBER_CONFIRMATION',dataObj).then((result1) => {
            //             console.log(result1); 
            //             const messageString = result1;
            //             //return this.sendResponse(res, true, statusCode, data, message);
            //          });
            //     }
            // // });
            /* cron.schedule("* * * * *", async () => {
                const { error, response } = await mobilenumberCronRepository.callVoucherLowQuantity();
                if (error) {
                    return error;
                }
                this.voucherResponse = response;
                this.str += "<p>Dear Admin, This is reminder for coupons low quantity.</p></br>"
                this.voucherResponse.forEach(row => {
                    if (element.flag == 1) {
                        if (element.couponFor <= 5) {
                            this.str += `<p>Milestone ${element.couponFor}</p>`;
                        }
                        this.str += "<br/> <p>This all voucher quantity is low , kindly please upload a voucher.<p>"
                    }
                });
                // this.sendEmail("","mmkirad@gmail.com","Reminder:Voucher Low",this.str);
            }); */
            this.str = "";

            //Birthday campaign
            /* cron.schedule("* * * * *", async () => {
                console.log("In birthdayCampaign");
                const birthdayResponse = await merchantCampaignsRepository.birthdayCampaign();
            }); */
        } catch (err) {
            return this.sendResponse('res', false, 500, {}, 'Failed to check username.');
        }
    }
    async optOut(req, res, next) {
        try {
            const resultMobile = await cronRepository.optOutMobile();
            const resultEmail = await cronRepository.optOutEmail();

            if (resultMobile.optOutMobile) {
                for (let element of resultMobile.optOutMobile) {
                    const data = Object.assign({ "type": 1 }, element)
                    const token = await this.generateToken(data);
                    const optoutLink = await this.shortURL("http://crocs.boomerup.com/otp-out/?q=" + token);
                    const dataObj = {
                        customerName: `${element.first_name} ${element.last_name}`,
                        mobile_number: element.mobile_number,
                        optoutLink: optoutLink
                    }
                    const result = await this.sendSMS('OPT_OUT', dataObj);
                }
                // const optoutLink = await this.shortURL("http://crocs.boomerup.com/otp-out/?q=" + token);
                // return this.sendResponse(res, true, 200, { resultMobile }, 'Mobile successfully unsubscribe!');
            }
            if (resultEmail.optOutEmail) {
                for (let element of resultEmail.optOutEmail) {
                    const data = Object.assign({ "type": 2 }, element);
                    const token = await this.generateToken(data);
                    const optoutLink = await this.shortURL("http://crocs.boomerup.com/otp-out/?q=" + token);
                    const dataObj = {
                        customerName: `${element.first_name} ${element.last_name}`,
                        toEmail: element.email_address,
                        optoutLink: optoutLink
                    }
                    const result = await this.sendEmail('OPT_OUT', dataObj);
                }
                // return this.sendResponse(res, true, 200, { resultEmail }, 'Email successfully unsubscribe!');
            }
            return this.sendResponse(res, true, 200, '', '');
        } catch (error) {
            return next(error);
        };
    }


}

// const cronCtrl = new CronsController();
const paymentCtrl = new PaymentController();
// const voucherCtrl = new VoucherController();
// const transactionCtrl = new TransactionController();
// const job =
cron.schedule("* 1 * * *", function () {
    console.log("running a task Payment");
    paymentCtrl.downloadFile('payment');
    // voucherCtrl.downloadFile('voucher');
    // transactionCtrl.downloadFile('transaction');
});

// console.log(job);

