DELIMITER $$
DROP PROCEDURE IF EXISTS verifyOTP$$
CREATE PROCEDURE verifyOTP(IN mobileNumber VARCHAR(15), IN mobileOTP INT(6),IN platForm TINYINT(1),IN otpGeneratedFor TINYINT(3), IN requestFor VARCHAR(10))
    verifyOTP:BEGIN
        DECLARE otpId, statusCode INTEGER(11) DEFAULT 0;
        DECLARE currentOTP, rndOTP TEXT DEFAULT NULL;
        DECLARE firstName, lastName, emailAddress, status VARCHAR(100) DEFAULT '';
        DECLARE message VARCHAR(255);
        DECLARE dateOfBirth, anniversaryDate, spouseDob DATE DEFAULT NULL;
        DECLARE otpUsed, otpExpired, otpAttempt, maritalStatus, userGender, userStatus TINYINT(1) DEFAULT 0;
        DECLARE createdAt, updatedAt TIMESTAMP DEFAULT NULL;

		CALL checkUserStatus(mobileNumber, firstName, lastName, emailAddress, dateOfBirth, anniversaryDate, spouseDob,  maritalStatus, userGender, userStatus, status, message, statusCode);	
        IF statusCode != 200 AND statusCode != 104 THEN
            SELECT status, message, statusCode;
            LEAVE verifyOTP;
        END IF;
        
        SELECT id, otp, otp_used, otp_expired, otp_attempt, created_at , updated_at 
        INTO otpId, currentOTP, otpUsed, otpExpired, otpAttempt, createdAt, updatedAt
        FROM customer_otp 
        WHERE mobile_number = mobileNumber AND otp_attempt <= 3 AND otp_used = 0 AND otp_expired = 0 AND created_at >= DATE_SUB(NOW(),INTERVAL 15 MINUTE) 
        order by created_at desc limit 1;
		
        START TRANSACTION;

        IF otpAttempt = 3 THEN
            SET status = 'SUCCESS', message = 'OTP attempts exceeded.', statusCode = 101;
            SELECT mobileNumber, mobileOTP, otpAttempt, createdAt, status, message, statusCode;
            LEAVE verifyOTP;
        ELSE
            IF requestFor = 'SENDOTP' OR requestFor = 'RESENDOTP' THEN
                    IF otpId = 0 THEN                    
                        SET rndOTP = LPAD(FLOOR(RAND() * 999999.99), 6, 1);
                        INSERT INTO customer_otp(mobile_number, otp,platform_generated_on, otp_generated_for) VALUES (mobileNumber, rndOTP, platForm, otpGeneratedFor);
                        IF LAST_INSERT_ID() = 0 THEN
                            ROLLBACK;
                            SET status = 'FAILURE', message = 'Faled to insert data.', statusCode = 520;
                            SELECT status, message, statusCode;
                            LEAVE verifyOTP;
                        ELSE
							COMMIT;
                            SET otpId = LAST_INSERT_ID();                            
                            SELECT id, otp, otp_used, otp_expired, otp_attempt, created_at , updated_at 
                            INTO otpId, currentOTP, otpUsed, otpExpired, otpAttempt, createdAt, updatedAt
                            FROM customer_otp 
                            WHERE id = otpId;  
                        END IF;
                    END IF;
                    IF requestFor = 'RESENDOTP' THEN
                        SET createdAt = NOW();
                        UPDATE customer_otp SET created_at = createdAt WHERE id = otpId;
                            IF ROW_COUNT() = 0 THEN
                                ROLLBACK;
                                SET status = 'FAILURE', message = 'Faled to update data.', statusCode = 520;
                                SELECT status, message, statusCode;                                
                                LEAVE verifyOTP;
							ELSE 
								COMMIT;
                            END IF;
                    END IF;
                    SET status = 'SUCCESS', message = 'OTP sent successfully.', statusCode = 200;
                    SELECT otpId, currentOTP, otpUsed, otpExpired, otpAttempt, createdAt, updatedAt, status, message, statusCode;
                    LEAVE verifyOTP;                   
                ELSEIF requestFor = 'VERIFYOTP' THEN
                    IF otpId = 0 THEN
                        SET status = 'SUCCESS', message = 'Invalid OTP.', statusCode = 104;
                        SELECT status, message, statusCode; 
                        LEAVE verifyOTP;                        
                    ELSE
                        IF mobileOTP = currentOTP THEN 
                            UPDATE customer_otp SET otp_used = 1, otp_expired = 1 WHERE id = otpId;
                            IF ROW_COUNT() = 0 THEN
                                ROLLBACK;
                                SET status = 'FAILURE', message = 'Faled to update data.', statusCode = 520;
                                SELECT status, message, statusCode;
                                LEAVE verifyOTP;
                            ELSE  
								COMMIT;
                                IF userStatus = 1 THEN
                                    SET status = 'SUCCESS', message = 'OTP verified successfully.', statusCode = 200;
                                    SELECT firstName AS first_name, lastName AS last_name, emailAddress AS email_address, mobileNumber AS mobile_number, dateOfBirth AS date_of_birth, 
                                    spouseDob AS spouse_dob, anniversaryDate AS anniversary_date, maritalStatus AS marital_status, userGender AS gender, userStatus AS user_status,
                                    1 AS isRegister, status, message, statusCode
                                    FROM customer_loyalty 
                                    WHERE mobile_number = mobileNumber; 
                                ELSE
                                    SET status = 'SUCCESS', message = 'OTP verified successfully.', statusCode = 200;
                                    SELECT  0 AS isRegister, status, message, statusCode;
                                    LEAVE verifyOTP;
                                END IF;
                            END IF;
                        ELSE
                        SET otpAttempt = otpAttempt + 1;
                            UPDATE customer_otp SET otp_attempt = otpAttempt WHERE id = otpId;
                            IF ROW_COUNT() = 0 THEN
                                ROLLBACK;
                                SET status = 'FAILURE', message = 'Faled to update data.', statusCode = 520;
                                SELECT status, message, statusCode;
                                LEAVE verifyOTP;
                            ELSE                                
                                COMMIT;
                                SET status = 'SUCCESS', message = 'Invalid OTP.', statusCode = 104;
                                SELECT status, message, statusCode;
                                LEAVE verifyOTP; 
                            END IF;
                       END IF;
                    END IF;
                ELSE    
                    SET status = 'FAILURE', message = 'Something went wrong.', statusCode = 422;            
                    SELECT status, message, statusCode;
            END IF;
        END IF;    
    END$$
DELIMITER ;