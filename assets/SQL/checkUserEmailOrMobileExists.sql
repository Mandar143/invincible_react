DELIMITER $$
DROP PROCEDURE IF EXISTS checkUserEmailOrMobileExists$$
CREATE PROCEDURE checkUserEmailOrMobileExists(IN fieldName VARCHAR(15), IN fieldValue VARCHAR(15), IN merchantId INT, OUT status VARCHAR(100), OUT message VARCHAR(255), OUT statusCode INT)
    checkUserEmailOrMobileExists:BEGIN
        SET @customerId = 0;
        SET @query = CONCAT('SELECT id INTO @customerId FROM customer_loyalty WHERE merchant_id != ',merchantId, ' AND ',fieldName, ' = "',fieldValue,'"');
        PREPARE stmt FROM @query;
        EXECUTE stmt;
        DEALLOCATE PREPARE stmt;
        IF @customerId > 0 THEN
            SET status = 'FAILURE', message = CONCAT(fieldName,' already exists.'), statusCode = 422;         
            LEAVE checkUserEmailOrMobileExists;   
        ELSE
            SET status = 'SUCCESS', message = CONCAT(fieldName,' not exists.'), statusCode = 104;
            LEAVE checkUserEmailOrMobileExists;
        END IF;
    END$$
DELIMITER ;