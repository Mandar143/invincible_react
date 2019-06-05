import * as _ from 'lodash';
import * as Joi from 'joi';

export default (useJoiError = false, Schemas: {}) => {
    // useJoiError determines if we should respond with the base Joi error
    // boolean: defaults to false
    const _useJoiError = _.isBoolean(useJoiError) && useJoiError;

    // enabled HTTP methods for request data validation
    const _supportedMethods = ['post', 'put'];

    // Joi validation options
    const _validationOptions = {
        abortEarly: false, // abort after the last validation error
        allowUnknown: true, // allow unknown keys that will be ignored
        stripUnknown: true, // remove unknown keys from the validated data
        escapeHtml: true
    };

    // return the validation middleware
    return (req, res, next) => {

        const route = req.route.path;
        const method = req.method.toLowerCase();
        if (_.includes(_supportedMethods, method) && _.has(Schemas, route)) {

            // get schema for the current route
            const _schema = _.get(Schemas, route);
            if (_schema) {

                // Validate req.body using the schema and validation options
                return Joi.validate(req.body, _schema, _validationOptions, (err, data) => {
                    if (err) {
                        let collectErrors = {};
                        // Joi Error
                        const JoiError = {
                            status: 'FAILURE',
                            error: {
                                original: err._object,


                                // fetch only message and type from each error
                                details: _.map(err.details, ({ message, type, context }) => ({
                                    message: message.replace(/['"]/g, ''),
                                    key: context.key,
                                   // type,
                                }))
                            }
                        };

                        // Custom Error
                        const CustomError = {
                            status: 'FAILURE',
                            error: 'Invalid request data. Please review request and try again.'
                        };

                        // Send back the JSON error response
                        res.status(422).json(_useJoiError ? JoiError : CustomError);

                    } else {
                        // Replace req.body with the data after Joi validation
                        req.body = data;
                        next();
                    }

                });

            }
        }

        next();
    };
};