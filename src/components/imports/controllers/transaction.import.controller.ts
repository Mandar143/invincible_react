import * as csv from 'fast-csv';
import { ImportController } from "../import.controller";
import { Transation } from '../models/transaction.model';
export class TransactionController extends ImportController {

    async readTransactionFile(fileName: string) {
        try {
            this.initParams();
            const logFileName = `${this.logsPath}sale_master_transaction.log`;
            let data = '';
            const fileNameWithoutPath = this.getFileNameWithoutPath(fileName);
            console.log(fileNameWithoutPath, ` --> start reading at: ${new Date()}`);
            data = `File Name: ${fileNameWithoutPath}\nstart reading at: ${new Date()}\n==============\n`;

            await this.log(logFileName, data);
            let csvstream = csv
                .fromPath(fileName,
                    {
                        headers: true
                    }
                )
                .validate((data) => this.validateRow(data, 'transaction', logFileName))

                //.on('data', async (row: Transation) => this.transationData(csvstream, row))
                .on('data', async (row: Transation) => {
                    csvstream.pause();
                    try {
                        if (this.valiadStrore().indexOf(row.StoreCode) !== -1) {
                            const items = this.insertData(row);
                            // console.log(items, '\n');
                            let sql = `INSERT INTO customer_order_details SET ? `;
                            sql += `ON DUPLICATE KEY UPDATE sku = VALUES(sku), product_quantity = VALUES(product_quantity), product_mrp = VALUES(product_mrp), product_price = VALUES(product_price), discounted_amount = VALUES(discounted_amount), order_type = VALUES(order_type), updated_by = 1, updated_at = CURRENT_TIMESTAMP`;

                            await this.excuteQuery(sql, items);
                        }
                    } catch (queryError) {
                        const errorOutput = this.handleTextTableData(['invalid column value', queryError.message], 'database');
                        const rowOutput = this.handleTextTableData(row, 'data');
                        await this.log(logFileName, `\n${errorOutput}\n${rowOutput}\n--------------\n`);
                    }
                    csvstream.resume();
                })
                .on('end', async () => this.endStream(fileName, logFileName));
        } catch (error) {
            console.log('readTrasactionFile error', error);
            throw error;
        }
    }

    insertData(row: Transation) {
        return {
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
    }
}