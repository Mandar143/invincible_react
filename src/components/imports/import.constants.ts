export default {
    logsPath: 'assets/master_data/logs/',
    downloadPath: 'assets/master_data/downloads/',
    logPrefix: 'sale_master_',
    masterFolderPath: 'sales-master',
    filePrefix: 'CrocsLoyalty',
    fileExtention: 'csv',
    ftpFolderPath: '/public_html/crocsftp',
    payment: {
        masterFolderPath: 'sales-master',
        subFolderPath: 'payment',
        excuteFunctionName: 'readPaymentFile',
        schemaPath: 'payment',
        logFileName: 'payment.log',
        fileName: 'Payment'
    },
    transaction: {
        masterFolderPath: 'sales-master',
        subFolderPath: 'transaction',
        excuteFunctionName: 'readTransactionFile',
        schemaPath: 'transaction',
        logFileName: 'transaction.log',
        fileName: 'Sales'
    },
    voucher: {
        masterFolderPath: 'sales-master',
        subFolderPath: 'voucher',
        excuteFunctionName: 'readVoucherFile',
        schemaPath: 'voucher',
        logFileName: 'voucher.log',
        fileName: 'RedeemDiscount'
    }
}