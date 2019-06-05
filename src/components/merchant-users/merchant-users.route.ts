import * as express from 'express';
let router = express();
import MerchantusersController from './merchant-users.controller';
import SchemaValidator from '../../shared/middlewares/SchemaValidator';
import { MerchantUsersSchemas } from './merchant-users.schemas';

const validateRequest = SchemaValidator(true, MerchantUsersSchemas);
const merchantUsersCtrl = new MerchantusersController();

// Get user list
router.post('/list', validateRequest, (req, res, next) => {
    merchantUsersCtrl.getUserList(req, res, next);
});

// Add user
router.post('/addUser', validateRequest, (req, res) => {
    merchantUsersCtrl.addUser(req, res);
});

// Update user
router.post('/updateUser', validateRequest, (req, res) => {
    merchantUsersCtrl.updateUser(req, res);
});

// Check username availability
router.post('/checkUsername', validateRequest, (req, res) => {
    merchantUsersCtrl.checkUsername(req.body, res);
});

// Get user types
router.get('/getUserTypes', (req, res) => {
    merchantUsersCtrl.getUserTypes(req, res);
});

// Get user details
router.get('/getUserProfileDetails', (req, res) => {
    merchantUsersCtrl.getUserProfileDetails(req, res);
});

// Delete user
router.post('/deleteUser', validateRequest, (req, res) => {
    merchantUsersCtrl.deleteUser(req, res);
});

// Get login logs
router.post('/getLoginLogs', validateRequest, (req, res) => {
    merchantUsersCtrl.getLoginLogs(req, res);
});

// Get customer dashboard details
router.post('/merchant-dashboard-details', validateRequest, (req, res, next) => {
    merchantUsersCtrl.getPOSDasboardDetails(req, res, next);
});

// Logout user
router.post('/logout', (req, res, next) => {
    merchantUsersCtrl.logout(req, res, next);
});

// Get Transations Report
router.post('/get-transactions-report', validateRequest, (req, res, next) => {
    merchantUsersCtrl.getTransactionsReport(req, res, next);
});

// Get Voucher reports
router.post('/voucherReports', validateRequest, (req, res, next) => {
    merchantUsersCtrl.voucherReports(req, res, next);
});

// Download Voucher reports
router.get('/voucherReportsDownload', (req, res, next) => {
    merchantUsersCtrl.voucherReportsDownload(req, res, next);
});

// Get transaction report snapshot or summary
router.post('/get-transaction-snapshot', validateRequest, (req, res, next) => {
    merchantUsersCtrl.getTransactionSnapshot(req, res, next);
});

// Get voucher redemption report snapshot or summary
router.post('/get-voucher-redemption-snapshot', validateRequest, (req, res, next) => {
    merchantUsersCtrl.getVoucherRedemptionSnapshot(req, res, next);
});
export default router;