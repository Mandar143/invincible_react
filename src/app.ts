import * as error from './shared/middlewares/error';
import * as bodyParser from 'body-parser';
import * as compression from 'compression';
import * as cors from 'cors';
import * as express from 'express';
import Config from './config/config';
import router from './routes';
// import connectionPool from './database/database-connection';
import BaseController from './shared/controller/BaseController';
import * as winston from 'winston';
// import MobileNumberChangeCronRepository from './components/crons/mobile-number-change-cron.repository';
import './components/crons/crons.controller';

// const cron = require("node-cron");
class App extends BaseController {
    public app;
    constructor() {
        super();
        this.initApp();
    }
    public initApp() {

        this.app = express();
        // process.setMaxListeners(0);
        process.on('uncaughtException', function (err, req, res, next) {
            console.log('uncaughtException', err.message);
            process.exit(1);
        });

        process.on('unhandledRejection', function (err, req, res, next) {
            console.log('unhandledRejection', err.message);
            process.exit(1);
        });

        /*
            Enables compression
        */
        this.app.use(compression({
            threshold: 0,
            filter: function () {
                return true;
            }
        }));

        this.app.use(bodyParser.json({
            limit: '20mb'
        }));
        this.app.use(bodyParser.urlencoded({
            limit: '20mb',
            extended: true
        }));

        this.app.use(cors());
        // this.app.use(connectionPool);
        this.app.use('/api', router);
        this.app.use('/images/', express.static(__dirname + '/../assets/images/'));

        // Allow to access images inside folder
        // this.app.use('/public/uploads/', express.static(__dirname + '/public/uploads/'));
        // this.app.use('/' + Constants.userProfileUploadedVirtualPath, express.static(__dirname + '/' + Constants.userProfileUploadPath));
        this.app.get("/", function (req, res) {
            res.status(200).send({ message: 'Welcome to our restful API' });
        });
        this.app.use(error);
        const server = this.app.listen(Config.APP_PORT || 8081, function (err, req, res, next) {
            const port = server.address().port;
            console.log(`server started at http://localhost:${port}`);
        });
        server.timeout = 60000 * 5;
    }
}

export default new App();