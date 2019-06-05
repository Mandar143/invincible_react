import * as express from 'express';
import SchemaValidator from '../../shared/middlewares/SchemaValidator';
import MerchantcustomersController from './merchant-customers.controller';
import { MerchantCustomersSchemas } from './merchant-customers.schemas';
let router = express();
const validateRequest = SchemaValidator(true, MerchantCustomersSchemas);
const merchantCustomersCtrl = new MerchantcustomersController();

// Get mobile number change log
router.post('/getMobileNumberChangeLog', validateRequest, (req, res, next) => {
    merchantCustomersCtrl.getMobileNumberChangeLog(req, res, next);
});

// Get home branch change request log
router.post('/getHomeBranchChangeRequests', validateRequest, (req, res, next) => {
    merchantCustomersCtrl.getHomeBranchChangeRequests(req, res, next);
});

// Get customer
router.post('/customer-details', (req, res) => {
    // console.log(req.body, 'route object');
    merchantCustomersCtrl.getCustomer(req.body, res);
});
// Get state
router.post('/getState', validateRequest, (req, res, next) => {
    merchantCustomersCtrl.getState(req, res, next);
});

// Get city by state
router.post('/getCity', validateRequest, (req, res, next) => {
    merchantCustomersCtrl.getCity(req, res, next);
});

// Get store locations
router.post('/getStoreLocations', validateRequest, (req, res, next) => {
    merchantCustomersCtrl.getStoreLocations(req, res, next);
});

// change request status for mobile or home branch
router.put('/changeRequestStatus', validateRequest, (req, res, next) => {
    merchantCustomersCtrl.changeRequestStatus(req, res, next);
});

// check for pending mobile or home branch change request
router.post('/check-for-pending-request', validateRequest, (req, res, next) => {
    merchantCustomersCtrl.checkForPendingRequest(req, res, next);
});

// get transaction for a customer
//move to customer route
router.post('/getTransactions', validateRequest, (req, res, next) => {
    merchantCustomersCtrl.getTransactions(req, res, next);
});

router.post('/getOrderDetails', (req, res, next) => {
    merchantCustomersCtrl.getOrderDetails(req, res, next);
});

router.post('/add-customer', validateRequest, (req, res, next) => {
    merchantCustomersCtrl.addCustomer(req, res, next);
});

router.post('/get-vouchers-coupons', validateRequest, (req, res, next) => {
    merchantCustomersCtrl.getVouchersCoupns(req, res, next);
});

router.post('/get-offer-coupons', validateRequest, (req, res, next) => {
    merchantCustomersCtrl.getOfferCoupns(req, res, next);
});

router.post('/verifyEmail', validateRequest, (req, res, next) => {
    merchantCustomersCtrl.verifyEmail(req, res, next);
});

router.post('/change-request-from-customer', validateRequest, (req, res, next) => {
    merchantCustomersCtrl.changeRequestFromCustomer(req, res, next);
});

router.post('/get-customer-feedback', validateRequest, (req, res, next) => {
    merchantCustomersCtrl.getCustomerFeedback(req, res, next);
});
export default router;