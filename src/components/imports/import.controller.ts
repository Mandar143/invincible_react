import * as fs from 'fs';
import * as Client from 'ftp';
import * as Joi from 'joi';
import * as _ from 'lodash';
import * as path from 'path';
import { table } from 'table';
import constants from '../../config/constants';
import pool from '../../database/database-connection';
import BaseController from "../../shared/controller/BaseController";
import { cronSchemas } from '../crons/cron.schemas';
import importConstants from "./import.constants";
import { voucherSchema } from './import.schemas';
import { SpResponse } from '../../shared/models/SpResponse';

const _validationOptions = {
    abortEarly: false, // abort after the last validation error
    // allowUnknown: true, // allow unknown keys that will be ignored
    stripUnknown: true, // remove unknown keys from the validated data
    escapeHtml: true
};

export class ImportController extends BaseController {
    logsPath = 'assets/master_data/logs/';
    downloadPath = 'assets/master_data/downloads/'
    totalRowCount: number = 0;
    totalValidCount: number = 0;
    totalInvalidCount: number = 0;

    initParams() {
        this.totalRowCount = 0;
        this.totalValidCount = 0;
        this.totalInvalidCount = 0;
    }

    deleteFile(path: string) {
        fs.unlink(path, (err) => {
            if (err) return console.log(err);
            console.log(`\n${path} was deleted\n`);
        });
    }

    log(fileName: string, data: string): Promise<boolean> {
        return new Promise((resolve, rejecct) => {
            fs.appendFile(fileName, data, { encoding: 'utf8' }, (err) => {
                if (err) {
                    console.log('append error', err);
                    return resolve(false);
                }
                return resolve(true);
            });
        });
    }

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

    handleTextTableData(data: any, flag: string) {
        try {
            let errorTable = [], errorDetails = [];
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

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
    }

    ftpError(error) {
        console.log('Fail to download ', error.message);
    }

    renameFileName(fileName: string): string {
        return new Date().getTime() + '_' + fileName.replace(/\s+/g, '_').replace('-', '_');
    }

    async validateRow(row, schemaPath, logFileName) {
        this.totalRowCount += 1;
        const _schema = _.get(cronSchemas, `/${schemaPath}/`);
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
            await this.log(logFileName, `\n${errorOutput}\n${rowOutput}\n--------------\n`)
        } catch (error) {
            console.log("error in validate data", error.message);
        }
    }

    getFileName(importType) {
        const fileNameData = [importConstants.filePrefix, importConstants[importType].fileName, this.getCustomStringDate(this.todayDate, '')];
        const stringFileName = fileNameData.join('_');
        return `${stringFileName}.${importConstants.fileExtention}`;
    }

    generateFolderPath(name: string) {
        const pathSeparator = path.sep;
        return name.replace(/.+/g, `${pathSeparator} $ & ${pathSeparator} `)
    }

    getFileNameWithoutPath(fileName: string): string {
        return fileName.slice(fileName.lastIndexOf('/') + 1);
    }

    ftpReady(aClient: Client, importType: string) {
        try {
            let excuteFunction = '';
            const ftpFolderPath = [importConstants.ftpFolderPath, importConstants.masterFolderPath, importConstants[importType].subFolderPath].join('/');
            const ftpFileFolderPath = ftpFolderPath + '/';//this.generateFolderPath(ftpFolderPath);
            const fileName = this.getFileName(importType);
            const ftpFilePath = ftpFileFolderPath + fileName;
            const copyFileName = importConstants.downloadPath + `copy_${this.renameFileName(fileName)} `;
            excuteFunction = importConstants[importType].excuteFunctionName;

            aClient.get(ftpFilePath, (err, stream) => {
                if (err) {
                    aClient.end();
                    console.log('ready error', err.message);
                    return;
                }
                console.log('stream start');
                stream.once('close', () => {
                    aClient.end();
                    console.log('connection close');
                    const currentExcuteFunction = `this.${excuteFunction} ('${copyFileName}'); `
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

    downloadFile(importType: string) {
        try {
            const aClient = new Client();

            //  aClient.on('error', error => this.ftpError(error));
            aClient.on('error', error => {
                aClient.end();
                console.log('Fail to download ', error.message);
            });
            aClient.on('close', () => {
                console.log('FTP connection fully Close');
            });

            aClient.on('end', () => {
                console.log('FTP connection ended');
            });

            aClient.on('ready', () => this.ftpReady(aClient, importType));

            aClient.connect(constants.ftp2);

        } catch (error) {
            // await this.log(logFileName, statingData);
            console.log(error);
        }
    }



    protected async excuteQuery(sqlQuery: string, param: any): Promise<any> {
        try {
            return await pool.query(sqlQuery, param);
        } catch (error) {
            throw error;
        }
    }

    protected async validateVoucher(row, logFileName) {
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
            await this.log(logFileName, `\n${errorOutput} \n${rowOutput} \n--------------\n`)
        } catch (error) {
            console.log("error in validate data", error.message);
        }
    }

    valiadStrore() {
        return ['TVQ', 'IMQ', 'PHQ', 'KPQ', 'LKQ', 'GTQ', 'AAQ'];
    }
}