DELIMITER $$
DROP PROCEDURE IF EXISTS verifyOTP$$
CREATE PROCEDURE verifyOTP(IN otpData JSON)
    verifyOTP:BEGIN
        DECLARE otpId, merchantId,statusCode, mobileOTP, currentOTP, rndOTP INTEGER DEFAULT 0;
        DECLARE mobileNumber, requestFor VARCHAR(15) DEFAULT '';
        DECLARE firstName, lastName, emailAddress, status VARCHAR(100) DEFAULT '';
        DECLARE message VARCHAR(255);
        DECLARE dateOfBirth, anniversaryDate, spouseDob DATE DEFAULT NULL;
        DECLARE otpUsed, otpExpired, otpAttempt, maritalStatus, userGender, userStatus, platForm TINYINT(1) DEFAULT 0;
        DECLARE otpGeneratedFor TINYINT(3) UNSIGNED DEFAULT 0;
        DECLARE createdAt, updatedAt TIMESTAMP DEFAULT NULL;
        DECLARE inputData,outPutData,customerData JSON DEFAULT NULL;        
        IF otpData IS NOT NULL AND JSON_VALID(otpData) = 0 THEN
            SET status = 'FAILURE', message = 'Please provide valid data.', statusCode = 520;
            SELECT JSON_OBJECT('status', status, 'message', message,'data',JSON_OBJECT(),'statusCode',statusCode) AS response;
            LEAVE verifyOTP;
        ELSE
            SET mobileNumber = JSON_UNQUOTE(JSON_EXTRACT(otpData,'$.mobile_number'));
            SET mobileOTP = JSON_EXTRACT(otpData,'$.otp');
            SET platForm = JSON_EXTRACT(otpData,'$.platForm');
            SET otpGeneratedFor = JSON_EXTRACT(otpData,'$.otp_generated_for');
            SET requestFor = JSON_UNQUOTE(JSON_EXTRACT(otpData,'$.request_for'));
            SET merchantId = JSON_EXTRACT(otpData,'$.merchant_id');

            IF mobileNumber IS NOT NULL AND merchantId IS NOT NULL AND platForm IS NOT NULL AND otpGeneratedFor IS NOT NULL AND requestFor IS NOT NULL THEN
                SET inputData = JSON_OBJECT('mobile_number',mobileNumber,'merchant_id',merchantId);
            ELSE
                SET status = 'FAILURE', message = 'Something missing in input verifyOTP.', statusCode = 520;
                SELECT JSON_OBJECT('status', status, 'message', message,'data',JSON_OBJECT(),'statusCode',statusCode) AS response;
                LEAVE verifyOTP;
            END IF;
        END IF;
		
        CALL checkUserStatus(inputData,outPutData);	
        SET statusCode = JSON_EXTRACT(outPutData,'$.statusCode');
        IF statusCode != 200 AND statusCode != 104 THEN
            SELECT outPutData AS response;
            LEAVE verifyOTP;        
        END IF; 
        
        IF outPutData IS NOT NULL AND JSON_VALID(otpData) = 0 THEN    
            SET status = 'FAILURE', message = 'Invalid output data.', statusCode = 520;
            SELECT JSON_OBJECT('status', status, 'message', message,'data',JSON_OBJECT(),'$.statusCode',statusCode) AS response;           
        ELSE        
            SET customerData = JSON_EXTRACT(outPutData,'$.data');
            SET userStatus = JSON_EXTRACT(customerData,'$.userStatus');               
        END IF;       
        
        SELECT id, otp, otp_used, otp_expired, otp_attempt, created_at , updated_at 
        INTO otpId, currentOTP, otpUsed, otpExpired, otpAttempt, createdAt, updatedAt
        FROM customer_otp 
        WHERE mobile_number = mobileNumber AND otp_attempt <= 3 AND otp_used = 0 
       -- AND otp_generated_for = otpGeneratedFor
        AND otp_expired = 0 AND created_at >= DATE_SUB(NOW(),INTERVAL 15 MINUTE) 
        order by created_at desc limit 1;
		
        START TRANSACTION;

        IF otpAttempt = 3 THEN
            SET customerData = JSON_SET(customerData,'$.statusCode',101,'$.mobile_number',mobileNumber,'$.otp',mobileOTP,'$.otp_attempt',otpAttempt,'$.created_at', createdAt);
            SELECT JSON_SET(outPutData,'$.status','SUCCESS','$.data',customerData,'$.message', 'OTP attempts exceeded.','$.statusCode',101) AS response;
            LEAVE verifyOTP;
        ELSE
            IF requestFor = 'SENDOTP' OR requestFor = 'RESENDOTP' THEN
                    -- IF otpId = 0 THEN                    
                        SET rndOTP = LPAD(FLOOR(RAND() * 999999.99), 6, 1);
                        INSERT INTO customer_otp(mobile_number, otp,platform_generated_on, otp_generated_for) VALUES (mobileNumber, rndOTP, platForm, otpGeneratedFor);
                        IF LAST_INSERT_ID() = 0 THEN
                            ROLLBACK;
                            SET status = 'FAILURE', message = 'Failed to insert data.', statusCode = 520;
                            SELECT JSON_SET(outPutData,'$.status', status, '$.message', message,'$.statusCode',statusCode) AS response;
                            LEAVE verifyOTP;
                        ELSE
							COMMIT;
                            SET otpId = LAST_INSERT_ID();                            
                            SELECT id, otp, otp_used, otp_expired, otp_attempt, created_at , updated_at 
                            INTO otpId, currentOTP, otpUsed, otpExpired, otpAttempt, createdAt, updatedAt
                            FROM customer_otp 
                            WHERE id = otpId;  
                        END IF;
                    -- END IF;
                    IF requestFor = 'RESENDOTP' THEN
                        SET createdAt = NOW();
                        UPDATE customer_otp SET created_at = createdAt WHERE id = otpId;
                            IF ROW_COUNT() = 0 THEN
                                ROLLBACK;
                                SET status = 'FAILURE', message = 'Failed to update data.', statusCode = 520;
                                SELECT JSON_SET(outPutData,'$.status', status, '$.message', message,'$.statusCode',statusCode) AS response;
                                LEAVE verifyOTP;
							ELSE 
								COMMIT;
                            END IF;
                    END IF;
                    SET status = 'SUCCESS', message = 'OTP sent successfully.', statusCode = 200;
                    SET customerData =JSON_REMOVE(customerData,'$.statusCode'); 
                    SET customerData = JSON_SET(customerData,'$.otp_id',otpId,'$.current_otp',currentOTP,'$.otp_expired',otpExpired,'$.otp_attempt',otpAttempt,'$.created_at', createdAt,'$.updated_at',updatedAt);
                    SELECT JSON_SET(outPutData,'$.data',customerData,'$.status', status, '$.message', message,'$.statusCode',statusCode) AS response;
                    LEAVE verifyOTP;                   
                ELSEIF requestFor = 'VERIFYOTP' THEN
                    IF otpId = 0 THEN
                        SET status = 'SUCCESS', message = 'Invalid OTP.', statusCode = 104;
                        SET customerData =JSON_SET(customerData,'$.statusCode',104,'$.otp_attempt',otpAttempt);
                        SELECT JSON_SET(outPutData,'$.status', status,'$.data',customerData, '$.message', message,'$.statusCode',statusCode) AS response;
                        LEAVE verifyOTP;                        
                    ELSE                     
                        IF mobileOTP = currentOTP THEN 
                            UPDATE customer_otp SET otp_used = 1, otp_expired = 1, otp_attempt = otp_attempt + 1 WHERE id = otpId;
                            IF ROW_COUNT() = 0 THEN
                                ROLLBACK;
                                SET status = 'FAILURE', message = 'Failed to update data.', statusCode = 520;
                                SELECT JSON_SET(outPutData,'$.status', status, '$.message', message,'$.statusCode',statusCode) AS response;
                                LEAVE verifyOTP;
                            ELSE  
								COMMIT;
                                IF userStatus = 1 THEN
                                    UPDATE customer_loyalty SET mobile_verified = 1 WHERE mobile_number = mobileNumber AND merchant_id = merchantId;
                                    SET status = 'SUCCESS', message = 'OTP verified successfully.', statusCode = 200;   
                                    SET customerData =JSON_REMOVE(customerData,'$.statusCode');                               
                                    SET customerData =JSON_SET(customerData,'$.isRegister',1);
                                    SELECT JSON_SET(outPutData,'$.data',customerData,'$.status', status, '$.message', message,'$.statusCode',statusCode) AS response;
                                   LEAVE verifyOTP;
                                ELSE
                                    SET status = 'SUCCESS', message = 'OTP verified successfully.', statusCode = 200;
                                    SET customerData =JSON_REMOVE(customerData,'$.statusCode'); 
                                    SET customerData =JSON_SET(customerData,'$.isRegister',0);
                                    SELECT JSON_SET(outPutData,'$.data',customerData,'$.status', status, '$.message', message,'$.statusCode',statusCode) AS response;
                                    LEAVE verifyOTP;
                                END IF;
                            END IF;
                        ELSE
                            SET otpAttempt = otpAttempt + 1;
                            UPDATE customer_otp SET otp_attempt = otpAttempt WHERE id = otpId;
                            IF ROW_COUNT() = 0 THEN
                                ROLLBACK;
                                SET status = 'FAILURE', message = 'Failed to update data.', statusCode = 520;
                                SELECT JSON_SET(outPutData,'$.status', status, '$.message', message,'$.statusCode',statusCode) AS response;
                                LEAVE verifyOTP;
                            ELSE                                
                                COMMIT;
                                SET status = 'SUCCESS', message = 'Invalid OTP.', statusCode = 104;
                                SET customerData =JSON_SET(customerData,'$.statusCode',104,'$.otp_attempt',otpAttempt);
                                SELECT JSON_SET(outPutData,'$.data',customerData,'$.status', status, '$.message', message,'$.statusCode',statusCode) AS response;
                                LEAVE verifyOTP; 
                            END IF;
                       END IF;
                    END IF;
                ELSE    
                    SET status = 'FAILURE', message = 'Something went wrong.', statusCode = 422;            
                    SELECT JSON_SET(outPutData,'$.status', status, '$.message', message,'$.statusCode',statusCode) AS response;
                    LEAVE verifyOTP; 
            END IF; 
        END IF;    
    END$$
DELIMITER ;