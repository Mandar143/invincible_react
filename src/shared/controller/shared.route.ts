import * as express from 'express';
import SharedController from './SharedController';
let router = express();

const SharedCntrl = new SharedController();

// Get mobile number change log
router.post('/changeRequestStatus', (req, res, next) => {
    SharedCntrl.changeRequestStatus(req, res, next);
});

// Verify email address
router.post('/verifyEmailAddress', (req, res, next) => {
    SharedCntrl.verifyEmailAddress(req, res, next);
});

// Get Static Pages for e.g Terms & Conditions
router.post('/getStaticPages', (req, res, next) => {
    SharedCntrl.getStaticPages(req, res, next);
});

// Get Static Pages for e.g Terms & Conditions
router.post('/optOut', (req, res, next) => {
    SharedCntrl.optOut(req, res, next);
});

// Get Static Pages for e.g Terms & Conditions
router.post('/optIn', (req, res, next) => {
    SharedCntrl.optIn(req, res, next);
});
//get pincode
router.post('/getPinCodes', (req, res, next) => {
    SharedCntrl.getPinCodes(req, res, next);
});

router.post('/getAllCities', (req, res, next) => {
    SharedCntrl.getAllCities(req, res, next);
});
export default router;