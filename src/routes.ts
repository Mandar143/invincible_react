import * as express from 'express';
// Routes for the component/module
import authRouter from './components/auth/auth.route';
// import cronRouter from './components/crons/cron.route';
import customerRouter from './components/customer/customer.route';
import masterImportRouter from './components/master-import/master-import.route';
import merchantCampaignsRouter from './components/merchant-campaigns/merchant-campaigns.route';
import merchantCustomersRouter from './components/merchant-customers/merchant-customers.route';
import merchantDetailsRouter from './components/merchant-details/merchant-details.route';
import merchantUsersRouter from './components/merchant-users/merchant-users.route';
import sharedRouter from './shared/controller/shared.route';
// Auth middleware
import authMW from './shared/middlewares/auth.middleware';
const router = express();

// Unauthorized/unprotected route e.g login, forgot pwd api etc.

router.use('/', authRouter);
// Unprotected routes ends here

//shared controller
router.use('/shared-controller', sharedRouter);
router.use('/master-import', masterImportRouter);


// Middleware which will authenticate token
router.use(authMW);

router.use('/customer', customerRouter);
// Protected routes starts here

router.use('/merchant-users', merchantUsersRouter);
router.use('/merchant-details', merchantDetailsRouter);
router.use('/merchant-customers', merchantCustomersRouter);
router.use('/merchant-campaigns', merchantCampaignsRouter);
// Protected routes ends here

export default router;
