import winston from 'winston';

let logger = winston.createLogger({
  transports: [
    new (winston.transports.Console),
  ],
  exitOnError: false, // do not exit on handled exceptions
});

export default logger;
