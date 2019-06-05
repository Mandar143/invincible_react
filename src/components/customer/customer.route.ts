import * as express from 'express';
import SchemaValidator from '../../shared/middlewares/SchemaValidator';
import CustomerController from './customer.controller';
import { CustomerSchemas } from './customer.schemas';
let router = express();
const validateRequest = SchemaValidator(true, CustomerSchemas);

const objUserCtrl = new CustomerController();

// Get customer
router.post('/customer-details', validateRequest, (req, res, next) => {
    objUserCtrl.getCustomer(req, res, next);
});

// Check existing mobile number
router.post('/check-mobile', (req, res, next) => {
    objUserCtrl.checkMobileNumber(req, res, next);
});

// Get customer dashboard details
router.post('/customer-dashboard-details', validateRequest, (req, res, next) => {
    objUserCtrl.getCustomerDasboardDetails(req, res, next);
});

// Get customer crocs feed
router.post('/customer-crocs-feed', validateRequest, (req, res, next) => {
    objUserCtrl.getCustomerCrocsFeed(req, res, next);
});

// Get customer Coupons/Vouchers
router.post('/customer-coupons-vouchers', validateRequest, (req, res, next) => {
    objUserCtrl.getCustomerCouponsVoucher(req, res, next);
});

// Get customer suggestion
router.post('/customer-suggestion', validateRequest, (req, res, next) => {
    objUserCtrl.getCustomerSuggestion(req, res, next);
});

// Get customer feedback
router.post('/customer-feedback', validateRequest, (req, res, next) => {
    objUserCtrl.customerFeedback(req, res, next);
});

router.put('/update-customer', validateRequest, (req, res, next) => {
    objUserCtrl.updateCustomer(req, res, next);
});

router.put('/update-coupans', validateRequest, (req, res, next) => {
    objUserCtrl.updateCoupons(req, res, next);
});

// Get Voucher details
router.post('/getVoucherDetails', (req, res) => {
    objUserCtrl.getVoucherDetails(req, res);
});

router.post('/search-customer', validateRequest, (req, res, next) => {
    objUserCtrl.searchCustomer(req, res, next);
});

// Get registered customers
router.post('/get-registered-customers', validateRequest, (req, res, next) => {
    objUserCtrl.getRegisteredCustomers(req, res, next);
});

// Get details search by location
router.post('/getSearchByLocations', validateRequest, (req, res, next) => {
    objUserCtrl.getSearchByLocations(req, res, next);
});

router.post('/getManageCustomersList', validateRequest, (req, res, next) => {
    objUserCtrl.getManageCustomersList(req, res, next);
});

// Get customer registration report snapshot or summary
router.post('/get-snapshot', validateRequest, (req, res, next) => {
    objUserCtrl.getSnapshot(req, res, next);
});

// Delete user by using id (user id)
// router.delete('/:_id', (req, res) => {
//     objUserCtrl.deleteUser(req.params, res);
// });

export default router;