import * as bcrypt from 'bcrypt';
import { User } from '../../model/User';
import SharedRepository from '../../repository/shared.repository';
import UserRepository from '../../repository/UserRepository';
import BaseController from '../../shared/controller/BaseController';
import CustomerRepository from '../customer/customer.repository';
const userRepository = new UserRepository();
const customerRepository = new CustomerRepository();
const sharedRepository = new SharedRepository();
class AuthController extends BaseController {
    async login(req, res, next) {
        try {
            const params = req.body;
            const userDetails: User = await userRepository.findOneByUsername(params.username);

            if (userDetails) {
                const user = Object.assign({}, userDetails);
                if (bcrypt.compareSync(params["password"], user.password)) {
                    delete user.password;
                    user.isMerchant = true;
                    await userRepository.loginLogs(user.user_id, (result: any) => {
                        user['loginLogId'] = result.loginLogId;
                    });

                    const userData = await this.getUserData(user, true);

                    return this.sendResponse(res, true, 200, { userData }, '');

                } else {
                    return this.sendResponse(res, false, 402, { isLogin: false, message: "Logged in Failed" }, 'Invalid username and password');
                }
            }
            else {
                return this.sendResponse(res, false, 402, { isLogin: false, message: "Logged in Failed" }, 'Invalid username and password');
            }
        } catch (error) {
            return next(error);
        }
    }

    async  getUser(params) {
        try {
            return await userRepository.findOneByUsername(params.username);
        } catch (err) {
            throw err;
        }
    }

    async sendOtp(req, res, next) {
        const mobile_number = req.body.mobile_number;
        customerRepository.sendOtp(req, async (err, result) => {
            if (err) {
                return next(err);
            }
            let { statusCode, message, data } = result;
            // console.log(result);

            //For SMS Send Api
            if (result.data.current_otp) {
                let dataObj = {
                    'currentOtp': result.data.current_otp,
                    'currentTime': new Date().toLocaleDateString(),
                    'mobile_number': mobile_number
                };
                let smsSent: any = await this.sendSMS('LOGIN_OTP', dataObj);
            }
            return this.sendResponse(res, true, statusCode, data, message);
        });
    }

    reSendOtp(req, res, next) {
        customerRepository.reSendOtp(req, (err, result) => {
            if (err) {
                return next(err);
            }

            let { statusCode, message, data } = result;

            return this.sendResponse(res, true, statusCode, data, message);

        });
    }

    verifyOtp(req, res, next) {

        customerRepository.verifyOtp(req, async (err, result) => {
            try {
                if (err) {
                    return next(err);
                }

                let { statusCode, message, data } = result;
                if (data['isRegister'] === 1) {
                    data.isCustomer = true;
                    const userData = await this.getUserData(data, true);

                    data = { isRegister: data.isRegister, userData, statusCode: 100 };
                }

                return this.sendResponse(res, true, statusCode, data, message);
            } catch (error) {
                return next(error);
            }
        });

    }
    async register(req, res, next) {
        try {
            let updatedData = {};
            const { request_source } = req.body;
            const validRequestSource = customerRepository.checkRequestSource(request_source);
            const { error, response } = await customerRepository.addOrUpdateCustomer(req);

            if (error) {
                let statusFlag: boolean;
                statusFlag = error.status == 'SUCCESS' ? true : false;
                return this.sendResponse(res, statusFlag, error.statusCode, error, error.message);
            }

            const { statusCode, data, message } = response;

            const userInfo = updatedData = data;
            let user: User;
            if (this.checkRequestSource(request_source) && statusCode === 200) {
                data.isCustomer = true;
                const userData = await this.getUserData(data, true);
                updatedData = {
                    status: "SUCCESS",
                    statusCode: 100,
                    userData,
                    message: `User ${validRequestSource.action == 'insert' ? 'register' : validRequestSource.action} successfully`
                }
            }
            return this.sendResponse(res, true, 200, updatedData, message);
        } catch (error) {
            next(error)
        }
    }

    /* generateToken(data: any): Promise<any> {
        if (!data.user_type_id) {
            data.user_type_id = 0;
        }
        data.isCustomer = true;
        return new Promise((resolve, reject) => {
            jwt.sign(data, Config.AUTHORIZATION_KEY, { expiresIn: '1d' }, (error, token) => {

                if (error) {
                    return reject(new Error('Token generation fail'));
                }

                data.token = token;

                const userMenu = MENU_ITEM.filter((item) => item.userType == 0).map(item => item.menu);
                if (!userMenu.length) {
                    data.actions = [];
                }
                data.actions = userMenu[0];

                resolve(data);
            })
        });
    } */

}

export default AuthController;