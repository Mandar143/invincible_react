import * as csv from 'fast-csv';
import * as fs from 'fs';
import * as Client from 'ftp';
import { SpResponse } from '../../../shared/models/SpResponse';
import importConstants from '../import.constants';
import { ImportController } from "../import.controller";
import { Voucher } from "../models/voucher.model";
export class VoucherController extends ImportController {

    // voucher validations
    async callVoucherValidation(params) {
        try {
            const spStatus = await this.excuteQuery(`CALL voucherValidation  (?);`, params)

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

    async readVoucherFile(fileName: string) {
        try {
            this.initParams();
            const logFileName = `${this.logsPath}sale_master_voucher.log`;
            let data = '';
            console.log(fileName, ` start reading at: ${new Date()}`);
            data = `File Name: ${fileName}\nstart reading at: ${new Date()}\n==============\n`;

            await this.log(logFileName, data);
            console.log('after await');
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
                        console.log(row, '\n', items);

                        const params = JSON.stringify(items);
                        console.log(params, '\n');
                        const { error, response } = await this.callVoucherValidation(params);
                        console.log(error, response);
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
                .on('end', async () => this.endStream(fileName, logFileName));
        } catch (error) {
            console.log('readVoucherFile error', error);
            throw error;
        }
    }

    ftpReady(aClient: Client, importType: string) {
        try {
            let excuteFunction = '';
            const ftpFolderPath = [importConstants.ftpFolderPath, importConstants.masterFolderPath, importConstants[importType].subFolderPath].join('/');
            const ftpFileFolderPath =  ftpFolderPath + '/'; //this.generateFolderPath(ftpFolderPath);
            const fileName = this.getFileName(importType);
            const ftpFilePath = ftpFileFolderPath + fileName;
            const copyFileName = importConstants.downloadPath + `copy_${this.renameFileName(fileName)}`;
            excuteFunction = importConstants[importType].excuteFunctionName;
            console.log('start Ready for downloading ....', fileName, '\n', 'ftpFilePath -->', ftpFilePath);

            aClient.get(ftpFilePath, (err, stream) => {
                if (err) {
                    console.log('ready error', err.message);
                    return;
                }
                console.log('stream start');
                stream.once('close', () => {
                    aClient.end();
                    console.log('connection close');
                    const currentExcuteFunction = `this.${excuteFunction}('${copyFileName}');`
                    try {
                        eval(currentExcuteFunction);
                        console.log('file download successfully');
                        return;
                    } catch (error) {
                        throw error;
                    }
                });

                stream.on('end', () => {
                    console.log('stream end');
                });

                stream.pipe(fs.createWriteStream(copyFileName));
            });
        } catch (error) {
            throw error;
        }
    }
}