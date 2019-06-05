import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as Client from 'ftp';
import * as Joi from 'joi';
import * as _ from 'lodash';
import { table } from 'table';
import constants from '../../config/constants';
import pool from '../../database/database-connection';
import BaseController from '../../shared/controller/BaseController';
import { SpResponse } from '../../shared/models/SpResponse';
import MerchantCampaignsRepository from '../merchant-campaigns/merchant-campaigns.repository';
import CronRepository from './cron.repository';
import { cronSchemas, trancationSchema, voucherSchema } from './cron.schemas';
import { CustomerOrder } from '../imports/models/customer-order.model';
import MobileNumberChangeCronRepository from './mobile-number-change-cron.repository';
import { Transation } from '../imports/models/transaction.model';
import { Voucher } from '../imports/models/voucher.model';
// import kue from 'kue';
import * as cron from 'node-cron';
// const cron = require("node-cron");


//const Joi = require('joi');
const mobilenumberCronRepository = new MobileNumberChangeCronRepository();
const merchantCampaignsRepository = new MerchantCampaignsRepository();
const pattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,15}$/;

const cronRepository = new CronRepository();
const _validationOptions = {
    abortEarly: false, // abort after the last validation error
    // allowUnknown: true, // allow unknown keys that will be ignored
    stripUnknown: true, // remove unknown keys from the validated data
    escapeHtml: true
};
// const fs = require('fs');
//const FTPClient = require('ftp');


export class CronsController extends BaseController {
    logsPath = 'assets/master_data/logs/';
    downloadPath = 'assets/master_data/downloads/'
    voucherResponse: any;
    str: string = "";
    totalRowCount: number = 0;
    totalValidCount: number = 0;
    totalInvalidCount: number = 0;
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
    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    ftpError(error) {
        console.log('Fail to download ', error.message);
        // return next(error);
    }

    getFileStream(error, stream) {
        console.log(error, stream);

    }
    ftpReady(client: Client, next) {
        let excuteFunction = '';
        const masterFolderPath = '/sales-master';

        const subFolderPath = `/payment/`;
        const fileName = 'Crocs payment Data April- 2019.csv';

        /*  const subFolderPath = '/transaction/';
         const fileName = 'Crocs Transaction Data April- 2019.csv'; */
        // const fileName = 'Crocs Transaction Data March-2019.csv';

        /*  const subFolderPath = '/voucher/';
         const fileName = 'CrocsDiscountDataSample.csv'; */
        excuteFunction = this.capitalizeFirstLetter(subFolderPath.replace(/\//g, ''));
        // this.capitalizeFirstLetter(excuteFunction);

        //console.log(global[excuteFunction]);

        const copyFileName = `copy_${fileName}`;
        const file = masterFolderPath + subFolderPath + fileName;

        client.get(file, (err, stream) => {
            if (err) {
                console.log('ready error', err.message);
                return next(err);
            }

            stream.once('close', () => {
                client.end();
                console.log('connection close');
                const tempFunName = `this.read${excuteFunction}File('${copyFileName}');`
                console.log(tempFunName);

                eval(tempFunName);
            });

            stream.on('end', () => {
                console.log('stream end');
            });

            /* stream.on('data', (data) => {
                console.log('data end', data);
                //  return this.sendResponse(res, true, 200, {}, '');
            }); */
            stream.pipe(fs.createWriteStream(copyFileName));
        });
    }

    renameFileName(fileName: string): string {
        return fileName.replace(/\s+/g, '_').replace('-', '_');
    }
    // downloadFile(req, res, next) {
    downloadFile() {
        try {
            // console.log(req.query);

            const c = new Client();

            /* c.on('error', error => {
                console.log('Fail to download ', error.message);
                return next(error);
            }); */

            c.on('error', error => this.ftpError(error));

            c.on('close', () => {
                console.log('FTP connection fully Close');
            });

            c.on('end', () => {
                console.log('FTP connection ended');
            });

            // Crocs Transaction Data April- 2019.csv
            c.on('ready', () => {
                let excuteFunction = '';
                const masterFolderPath = '/sales-master';

                const subFolderPath = `/payment/`;
                const fileName = 'payment_25_05_2019.csv';

                /* const subFolderPath = '/transaction/';
                const fileName = 'Crocs Transaction Data April- 2019.csv'; */
                // const fileName = 'Crocs Transaction Data March-2019.csv';

                /*  const subFolderPath = '/voucher/';
                 const fileName = 'CrocsDiscountDataSample.csv'; */


                excuteFunction = this.capitalizeFirstLetter(subFolderPath.replace(/\//g, ''));
                // this.capitalizeFirstLetter(excuteFunction);

                //console.log(global[excuteFunction]);

                const copyFileName = `copy_${this.renameFileName(fileName)}`;
                const copyFileNameWithPath = `${this.downloadPath}${copyFileName}`
                const file = masterFolderPath + subFolderPath + fileName;

                c.get(file, (err, stream) => {
                    if (err) {
                        console.log('ready error', err.message);
                        return;
                    }

                    stream.once('close', () => {
                        c.end();
                        console.log('connection close');
                        const tempFunName = `this.read${excuteFunction}File('${copyFileNameWithPath}');`
                        try {
                            eval(tempFunName);// string function name excute
                            // this.readPaymentFile(copyFileName); // payment
                            // this.readTransactionFile(copyFileName); // transaction
                            // this.readVoucherFile(copyFileName); // voucher
                            // return this.sendResponse(res, true, 200, {}, 'file download successfully.');
                            console.log('file download successfully');
                            return;
                        } catch (error) {
                            throw error;
                        }

                    });

                    stream.on('end', () => {
                        console.log('stream end');
                    });

                    /* stream.on('data', (data) => {
                        console.log('data end', data);
                        //  return this.sendResponse(res, true, 200, {}, '');
                    }); */
                    stream.pipe(fs.createWriteStream(copyFileNameWithPath));
                });
            });

            c.connect(constants.ftp1);

        } catch (error) {
            //  next(error);
            console.log(error);

        }
    }

    log(fileName: string, data: string): Promise<boolean> {
        return new Promise((resolve, rejecct) => {
            fs.appendFile(fileName, data, { encoding: 'utf8' }, (err) => {
                if (err) {
                    console.log(data);

                    console.log('append error', err);
                    return resolve(false);
                }
                return resolve(true);
            });
        });
    }

    initParams() {
        this.totalRowCount = 0;
        this.totalValidCount = 0;
        this.totalInvalidCount = 0;
    }

    handleTextTableData(data: any, flag: string) {
        try {
            let errorTable = [], rowTable = [], errorDetails = [], output = '';
            const errorHeaders = ['column', 'message'];
            if (flag === 'error') {
                errorDetails = _.map(data.details, ({ message, type, context }) => ([
                    context.key,
                    message.replace(/['"]/g, '')
                ]));
                errorTable = [[...errorHeaders], ...errorDetails];
            } else if (flag === 'database') {
                errorTable = [[...errorHeaders], [...data]];
            } else if (flag === 'data') {
                /* if (data['rowNumber']) {
                    data = { rowNumber: data.rowNumber, ...data };
                } */
                errorTable.push(_.keys(data));
                errorTable.push(_.values(data));
            }
            return table(errorTable);
        } catch (err) {
            console.log('handleTextTableData', err);
            throw err;
        }
    }

    async validateRow(row, schemaPath, logFileName) {
        this.totalRowCount += 1;
        const _schema = _.get(cronSchemas, `/${schemaPath}/`);
        // return true;
        try {
            const { error } = Joi.validate(row, _schema, _validationOptions);
            if (!error) {
                row['rowNumber'] = this.totalRowCount;
                return true;
            }
            row = { rowNumber: this.totalRowCount, ...row }
            const errorOutput = this.handleTextTableData(error, 'error');
            const rowOutput = this.handleTextTableData(row, 'data');
            this.totalInvalidCount += 1;
            await this.log(logFileName, `\n${errorOutput}\n${rowOutput}\n--------------\n`);
        } catch (error) {
            console.log("error in validate data", error.message);
        }
    }

   protected async endStream(logFileName: string) {
        console.log('totalRowCount---->', this.totalRowCount);
        console.log('totalInvalidCount---->', this.totalInvalidCount);

        console.log(`----------end-------------${new Date()}`);

        const refreshIntervalId = setTimeout(async () => {
            const statingData = `End at : ${new Date()}\n
                    ---------------------------------------- \n
                    totalRowCount----> ${this.totalRowCount} \n
                    ---------------------------------------- \n
                    totalInvalidCount----> ${this.totalInvalidCount} \n
                    ======================================== \n`;
            await this.log(logFileName, statingData);
            //    clearInterval(refreshIntervalId);
        }, 1000);
    }

    async  readPaymentFile(fileName: string) {
        try {
            this.initParams();
            const logFileName = `${this.logsPath}sale_master_payment.log`;
            const fileNameWithoutPath = fileName.slice(fileName.lastIndexOf('/') + 1);
            let data = '';
            console.log(fileNameWithoutPath, ` start reading at: ${new Date()}`);
            data = `File Name: ${fileNameWithoutPath}\nstart reading at: ${new Date()}\n==============\n`;

            await this.log(logFileName, data);

            let csvstream = csv
                .fromPath(fileName,
                    {
                        headers: true
                    }
                )
                .validate((data) => this.validateRow(data, 'payment', logFileName))
                /* 
                .on("data-invalid", function (data) {
                    // const { error } = Joi.validate(data, salePaymentSchema);
                    //  console.log('data-invalid', data, error, '\n');

                    //do something with invalid row
                }) */
                .on('data', async (row: CustomerOrder) => {
                    csvstream.pause();
                    try {
                        const items = {
                            merchant_id: 1,
                            loyalty_id: 1,
                            order_date: row.CreateDate,
                            order_number: row.InvoiceNumber,
                            order_amount: (parseInt(row.Cash) + parseInt(row.Card) + parseInt(row.Cheque)),
                            calculated_amount: (parseInt(row.Cash) + parseInt(row.Card) + parseInt(row.Cheque)),
                            discounted_amount: (parseInt(row.LineDisc) + parseInt(row.HeaderDisc)),
                            store_code: row.StoreCode,
                            mobile_number: row.MobileNo,
                            cash: row.Cash,
                            card: row.Card,
                            cheque: row.Cheque,
                            gv: row.GV,
                            credit_note: row.CreditNote,
                            excess_gv: row.ExcessGV,
                            round_off: row.RoundOff,
                            no_refound: row.NoRefound,
                            other_payments: row.OtherPayments,
                            legacy_gift_voucher: row.LegacyGiftVoucher,
                            legacy_adv_order: row.LegacyAdvOrder,
                            agent_account: row.AgentAccount,
                            mall_gift_voucher: row.MallGiftVoucher,
                            line_disc: row.LineDisc,
                            header_disc: row.HeaderDisc,
                            created_by: 1
                        };
                        let sql = `INSERT INTO customer_orders SET ? `;
                        sql += `ON DUPLICATE KEY UPDATE order_amount = VALUES(order_amount), calculated_amount = VALUES(calculated_amount), discounted_amount = VALUES(discounted_amount), cash = VALUES(cash), card = VALUES(card), cheque = VALUES(cheque), gv = VALUES(gv), credit_note = VALUES(credit_note), excess_gv = VALUES(excess_gv), round_off = VALUES(round_off), no_refound = VALUES(no_refound), other_payments = VALUES(other_payments), legacy_gift_voucher = VALUES(legacy_gift_voucher), legacy_adv_order = VALUES(legacy_adv_order), agent_account = VALUES(agent_account), mall_gift_voucher = VALUES(mall_gift_voucher), line_disc = VALUES(line_disc), header_disc = VALUES(header_disc), updated_by = 1, updated_at = CURRENT_TIMESTAMP`;
                        const query = await pool.query(sql, items);
                        //  console.log(query);
                    } catch (queryError) {
                        const errorOutput = this.handleTextTableData(['invalid column value', queryError.message], 'database');
                        const rowOutput = this.handleTextTableData(row, 'data');
                        await this.log(logFileName, `\n${errorOutput}\n${rowOutput}\n--------------\n`);
                    }
                    csvstream.resume();
                })
                .on('end', () => this.endStream(logFileName));
        } catch (error) {
            console.log('readPaymentFile error', error);
            throw error;
        }
    }

    async readTransactionFile(fileName: string) {
        try {
            this.initParams();
            const logFileName = `${this.logsPath}sale_master_transaction.log`;
            let data = '';
            console.log(fileName, ` start reading at: ${new Date()}`);
            data = `File Name: ${fileName}\nstart reading at: ${new Date()}\n==============\n`;

            await this.log(logFileName, data);
            let csvstream = csv
                .fromPath(fileName,
                    {
                        headers: true
                    }
                )
                // .validate((data) => this.validateTransation(data, logFileName))
                .validate((data) => this.validateRow(data, 'transaction', logFileName))

                //.on('data', async (row: Transation) => this.transationData(csvstream, row))
                .on('data', async (row: Transation) => {
                    csvstream.pause();
                    try {

                        const items = {
                            store_code: row.StoreCode,
                            mobile_number: row.MobileNo,
                            sku: row.Product,
                            invoice_number: row.InvoiceNumber,
                            product_quantity: row.SalesQty,
                            product_mrp: row.Mrp,
                            product_price: row.SalesValue,
                            discounted_amount: row.Discount,
                            order_date: row.InvoiceDate,
                            order_type: row.SaleType,
                            created_by: 1
                        };
                        // console.log(items);

                        let sql = `INSERT INTO customer_order_details SET ? `;
                        sql += `ON DUPLICATE KEY UPDATE sku = VALUES(sku), product_quantity = VALUES(product_quantity), product_mrp = VALUES(product_mrp), product_price = VALUES(product_price), discounted_amount = VALUES(discounted_amount), order_type = VALUES(order_type), updated_by = 1, updated_at = CURRENT_TIMESTAMP`;


                        const query = await pool.query(sql, items);
                        // console.log(query);
                    } catch (queryError) {
                        const errorOutput = this.handleTextTableData(['invalid column value', queryError.message], 'database');
                        const rowOutput = this.handleTextTableData(row, 'data');
                        await this.log(logFileName, `\n${errorOutput}\n${rowOutput}\n--------------\n`);
                    }
                    csvstream.resume();
                })
                .on('end', async () => this.endStream(logFileName));
        } catch (error) {
            console.log('readTrasactionFile error', error);
            throw error;
        }
    }

    async readVoucherFile(fileName: string) {
        try {
            this.initParams();
            const logFileName = `${this.logsPath}sale_master_voucher.log`;
            let data = '';
            console.log(fileName, ` start reading at: ${new Date()}`);
            data = `File Name: ${fileName}\nstart reading at: ${new Date()}\n==============\n`;

            await this.log(logFileName, data);
            let csvstream = csv
                .fromPath(fileName,
                    {
                        headers: true
                    }
                )
                //  .validate((row) => this.validateVoucher(row, logFileName))
                .validate((data) => this.validateRow(data, 'voucher', logFileName))
                //.on('data', async (row: Transation) => this.transationData(csvstream, row))
                .on('data', async (row: Voucher) => {
                    // console.log('data', row, '\n');
                    csvstream.pause();
                    try {

                        const items = {
                            voucher_code: row.Voucher_Code,
                            invoice_number: row.Redeem_Invoice_Number,
                            store_code: row.Redeem_Store,
                            order_date: row.Redeem_Date,
                            voucher_value: row.Redeem_Amount
                        };

                        const params = JSON.stringify(items);
                        const { error, response } = await this.callVoucherValidation(params);
                        // console.log(error, response);
                        if (error) {
                            const errorOutput = this.handleTextTableData(error, 'data');
                            const rowOutput = this.handleTextTableData(row, 'data');
                            await this.log(logFileName, `\n${errorOutput}\n${rowOutput}\n--------------\n`);
                        }
                    } catch (queryError) {
                        const errorOutput = this.handleTextTableData(['-', queryError.message], 'database');
                        const rowOutput = this.handleTextTableData(row, 'data');
                        await this.log(logFileName, `\n${errorOutput}\n${rowOutput}\n--------------\n`);
                    }
                    csvstream.resume();
                })
                .on('end', async () => this.endStream(logFileName));
        } catch (error) {
            console.log('readVoucherFile error', error);
            throw error;
        }
    }

    // voucher validations
    async callVoucherValidation(params) {
        try {
            const spStatus = await pool.query(`CALL voucherValidation  (?);`, params);
            // .then((result: ResultSetHeader) => result);


            if (Object.keys(spStatus).length < 1) {
                throw new Error('Procedure Error voucherValidation ');
            }
            const selectResut = <SpResponse>spStatus['0'][0]['response'];

            if (selectResut.statusCode != 200 && selectResut.statusCode != 108) {
                let errorData = { message: selectResut.message };
                if (!selectResut.data) {
                    errorData = { ...errorData, ...selectResut.data };
                }

                return { error: errorData };
            }
            return { error: null, response: selectResut };
        } catch (error) {
            //  console.log(error);
            throw error;
        }
    }

    async validateTransation(row, logFileName: string) {
        this.totalRowCount += 1;

        // return true;
        try {
            const { error } = Joi.validate(row, trancationSchema, _validationOptions);
            if (!error) {
                row['rowNumber'] = this.totalRowCount;
                return true;
            }
            row = { rowNumber: this.totalRowCount, ...row }
            const errorOutput = this.handleTextTableData(error, 'error');
            const rowOutput = this.handleTextTableData(row, 'data');
            this.totalInvalidCount += 1;
            await this.log(logFileName, `\n${errorOutput}\n${rowOutput}\n--------------\n`)
        } catch (error) {
            console.log("error in validate data", error.message);
        }

    }

    async validateVoucher(row, logFileName) {
        this.totalRowCount += 1;

        // return true;
        try {
            const { error } = Joi.validate(row, voucherSchema, _validationOptions);
            if (!error) {
                row['rowNumber'] = this.totalRowCount;
                return true;
            }
            row = { rowNumber: this.totalRowCount, ...row }
            const errorOutput = this.handleTextTableData(error, 'error');
            const rowOutput = this.handleTextTableData(row, 'data');
            this.totalInvalidCount += 1;
            await this.log(logFileName, `\n${errorOutput}\n${rowOutput}\n--------------\n`)
        } catch (error) {
            console.log("error in validate data", error.message);
        }
    }
}

const cronCtrl = new CronsController();

const job = cron.schedule("* * * * *", function () {
    console.log("running a task every minute");
    cronCtrl.downloadFile();
});

// console.log(job);

