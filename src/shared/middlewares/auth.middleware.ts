import * as jwt from 'jsonwebtoken';
import Config from '../../config/config';
import UserRepository from '../../repository/UserRepository';
import BaseController from '../controller/BaseController';
import { User } from '../../model/User';

const objBaseCtrl = new BaseController();
const userRepository = new UserRepository();

export default (req, res, next) => {
    let token = '';
    //console.log(req.headers.authorization)
    if (req.headers.authorization) {
        token = req.headers.authorization;
    } else {
        token = req.body.token || req.query.token;
    }
    if (token) {
        // verifies secret and checks token
        jwt.verify(token, Config.AUTHORIZATION_KEY, function (err, decoded: User) {
            if (err) {
                return objBaseCtrl.sendResponse(res, false, 401, {}, 'Failed to authenticate token');
            } else {

                if (!decoded) {
                    next(new Error('Somthing went wrong.'));
                    return;
                }
                if (decoded.isMerchant) {
                    userRepository.checkUsername(decoded.username, (error, result) => {
                        if (error) {
                            next(error);
                            return;
                        }
                        if (result["deletedUser"]) {
                            return objBaseCtrl.sendResponse(res, false, 401, {}, 'User has been deleted/inactive');
                        } else {
                            req.decoded = decoded;
                            next();
                            return;
                        }
                    });
                }

                if (decoded.isCustomer) {
                    userRepository.checkCustomer(decoded.mobile_number, (error, result) => {
                        if (error) {
                            next(error);
                            return;
                        }
                        if (result) {
                            return objBaseCtrl.sendResponse(res, false, 401, {}, result['status']);
                        }
                        req.decoded = decoded;
                        next();
                        return;
                    });
                }


            }
        });

    } else {
        return objBaseCtrl.sendResponse(res, false, 401, {}, 'Un-authorised access');
    }
};
