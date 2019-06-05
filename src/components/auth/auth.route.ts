import * as express from 'express';
import SchemaValidator from '../../shared/middlewares/SchemaValidator';
import AuthController from './auth.controller';
import { AuthSchemas } from './auth.schemas';
const authController = new AuthController();
let router = express();
const validateRequest = SchemaValidator(true, AuthSchemas);
router.post('/login', validateRequest, (req, res, next) => {
    authController.login(req, res, next);
});

router.post('/register', validateRequest, (req, res, next) => {
    authController.register(req, res, next);
});

// Send Otp
router.post('/requestOtp', validateRequest, (req, res, next) => {
    authController.sendOtp(req, res, next);
});

// Re Send Otp from mobile number
router.post('/reSendOtp', validateRequest, (req, res, next) => {
    authController.reSendOtp(req, res, next);
});

// Verify mobile number and otp
router.post('/verifyOtp', validateRequest, (req, res, next) => {
    authController.verifyOtp(req, res, next);
});
export default router;