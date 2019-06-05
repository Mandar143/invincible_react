DELIMITER $$
DROP PROCEDURE IF EXISTS checkUserStatus$$
CREATE PROCEDURE checkUserStatus(IN mobileNumber VARCHAR(15), OUT firstName VARCHAR(100), OUT lastName VARCHAR(100), OUT emailAddress VARCHAR(100), 
                                 OUT dateOfBirth DATE,OUT anniversaryDate DATE, OUT spouseDob DATE, OUT maritalStatus TINYINT(1), OUT userGender TINYINT(1), OUT userStatus TINYINT(1),
                                 OUT status VARCHAR(100), OUT message VARCHAR(255), OUT statusCode INT)
    checkUserStatus:BEGIN       
        IF EXISTS (SELECT id FROM customer_loyalty WHERE mobile_number = mobileNumber) THEN
            SELECT customer_loyalty.first_name, customer_loyalty.last_name, customer_loyalty.email_address, customer_loyalty.date_of_birth, customer_loyalty.anniversary_date, customer_loyalty.spouse_dob, customer_loyalty.marital_status, customer_loyalty.gender, customer_loyalty.status,
            'SUCCESS', 'User details.', 200
            INTO firstName, lastName, emailAddress, dateOfBirth, anniversaryDate, spouseDob, maritalStatus, userGender, userStatus,status, message, statusCode
            FROM customer_loyalty
            WHERE mobile_number = mobileNumber; 
            IF userStatus NOT IN (0,1,2,3) THEN
                SET status = 'SUCCESS', message = 'Invalid user.', statusCode = 105;
                LEAVE checkUserStatus;
            ELSEIF userStatus = 0 THEN
                SET status = 'SUCCESS', message = 'User profile is inactive, please contact site admin.', statusCode = 105;
                LEAVE checkUserStatus;
            ELSEIF userStatus = 2 THEN
                SET status = 'SUCCESS', message = 'User profile is deleted, please contact site admin.', statusCode = 105;
                LEAVE checkUserStatus;
            ELSEIF userStatus = 3 THEN
                SET status = 'SUCCESS', message = 'User profile is blocked, please contact site admin.', statusCode = 105;
                LEAVE checkUserStatus;
            END IF;
        ELSE
            SET status = 'SUCCESS', message = 'Record not found.', statusCode = 104;
            LEAVE checkUserStatus;
        END IF;
    END$$
DELIMITER ;