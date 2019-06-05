import * as csv from 'fast-csv';
import { ImportController } from "../import.controller";
import { CustomerOrder } from '../models/customer-order.model';
import importConstants from '../import.constants';
import { TransactionController } from './transaction.import.controller';
import constants from '../../../config/constants';
export default class PaymentController extends ImportController {

    protected async endStream(fileName: string, logFileName: string) {
        try {
            console.log('totalRowCount---->', this.totalRowCount);
            console.log('totalInvalidCount---->', this.totalInvalidCount);

            console.log(`----------end-------------${new Date()}`);

            setTimeout(async () => {
                try {
                    const statingData = `End at : ${new Date()}\n
                    ---------------------------------------- \n
                    totalRowCount----> ${this.totalRowCount} \n
                    ---------------------------------------- \n
                    totalInvalidCount----> ${this.totalInvalidCount} \n
                    ======================================== \n`;
                    // push data into log file
                    await this.log(logFileName, statingData);
                    const transactionCtel = new TransactionController()
                    transactionCtel.downloadFile('transaction');
                    //delete file
                    this.deleteFile(logFileName);
                    this.deleteFile(fileName);
                } catch (error) {
                    console.log('setTimeout', error);
                }
            }, 1000);
        } catch (error) {
            console.log('endStream', error);

            throw error;
        }
    }

    getSql() {
        let sql = `INSERT INTO customer_orders SET ? `;
        sql += `ON DUPLICATE KEY UPDATE order_amount = VALUES(order_amount), calculated_amount = VALUES(calculated_amount), discounted_amount = VALUES(discounted_amount), cash = VALUES(cash), card = VALUES(card), cheque = VALUES(cheque), gv = VALUES(gv), credit_note = VALUES(credit_note), excess_gv = VALUES(excess_gv), round_off = VALUES(round_off), no_refound = VALUES(no_refound), other_payments = VALUES(other_payments), legacy_gift_voucher = VALUES(legacy_gift_voucher), legacy_adv_order = VALUES(legacy_adv_order), agent_account = VALUES(agent_account), mall_gift_voucher = VALUES(mall_gift_voucher), line_disc = VALUES(line_disc), header_disc = VALUES(header_disc), updated_by = 1, updated_at = CURRENT_TIMESTAMP`;
        return sql;
    }

    async  readPaymentFile(fileName: string) {
        try {
            this.initParams();
            const logFileName = `${this.logsPath}sale_master_payment.log`;
            const fileNameWithoutPath = this.getFileNameWithoutPath(fileName);
            let data = '';
            console.log(fileNameWithoutPath, ` --> start reading at: ${new Date()}`);
            data = `File Name: ${fileNameWithoutPath}\nstart reading at: ${new Date()}\n==============\n`;

            await this.log(logFileName, data);

            let csvstream = csv
                .fromPath(fileName,
                    {
                        headers: true
                    }
                )
                .validate((data) => this.validateRow(data, 'payment', logFileName))

                .on('data', async (row: CustomerOrder) => {
                    csvstream.pause();
                    try {
                        if (this.valiadStrore().indexOf(row.StoreCode) !== -1) {
                            const items = this.insertData(row);
                            // console.log(items, '\n');

                            await this.excuteQuery(this.getSql(), items);
                        }
                    } catch (queryError) {
                        const errorOutput = this.handleTextTableData(['invalid column value', queryError.message], 'database');
                        const rowOutput = this.handleTextTableData(row, 'data');
                        await this.log(logFileName, `\n${errorOutput}\n${rowOutput}\n--------------\n`);
                    }
                    csvstream.resume();
                })
                .on('end', async () => await this.endStream(fileName, logFileName));
        } catch (error) {
            console.log('readPaymentFile error', error);
            throw error;
        }
    }

    insertData(row: CustomerOrder) {
        // console.log(row);
        let orderAmount = 0;
        let calculatedAmount = 0;
        let discountedAmount = 0;
        if (row.Cash) {
            const cash = parseFloat(row.Cash);
            orderAmount += cash;
            calculatedAmount += cash;
        }

        if (row.Card) {
            const card = parseFloat(row.Card);
            orderAmount += card;
            calculatedAmount += card;
        }

        if (row.Cheque) {
            const cheque = parseFloat(row.Cheque);
            orderAmount += cheque;
            calculatedAmount += cheque;
        }

        if (row.LineDisc) {
            const lineDisc = parseFloat(row.LineDisc);
            discountedAmount += lineDisc;
        }

        if (row.HeaderDisc) {
            const headerDisc = parseFloat(row.HeaderDisc);
            discountedAmount += headerDisc;
        }

        return {
            merchant_id: constants.merchantId,
            loyalty_id: 1,
            order_date: row.CreateDate,
            order_number: row.InvoiceNumber,
            order_amount: orderAmount,
            calculated_amount: calculatedAmount,
            discounted_amount: discountedAmount,
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
    }
}