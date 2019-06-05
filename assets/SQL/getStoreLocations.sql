DELIMITER $$
DROP PROCEDURE IF EXISTS getStoreLocations$$
CREATE PROCEDURE getStoreLocations(IN searchKey VARCHAR(100))
getStoreLocations:BEGIN
    DECLARE notFound INTEGER DEFAULT 0;
    DECLARE cityName VARCHAR(100) DEFAULT ''; 
    DECLARE cityString TEXT DEFAULT '';   
    DECLARE cityCursor CURSOR FOR
    SELECT city_name
    FROM sub_merchant_locations 
    WHERE status = 1 AND 
    IF (searchKey !='',city_name LIKE searchKey,1=1)
    GROUP BY city_name;
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
    SET SESSION group_concat_max_len = 10000000;
    OPEN cityCursor;
        cityLoop : LOOP
            FETCH cityCursor INTO cityName;
            IF(notFound = 1) THEN
                LEAVE cityLoop;
            END IF;
            IF cityString = '' THEN
                SET cityString = (SELECT CONCAT('{','"city":','"',cityName,'"',',','"stores":',CONCAT('[',GROUP_CONCAT(JSON_OBJECT('store_name',location_name,'store_code',store_code,'contact_mobile',contact_mobile,'contact_email',contact_email,'address_line1',address_line1,'latitude',latitude,'longitude',longitude)),']'),'}') FROM sub_merchant_locations WHERE city_name = cityName);
            ELSE
                SET cityString = CONCAT(cityString,',', (SELECT CONCAT('{','"city":','"',cityName,'"',',','"stores":',CONCAT('[',GROUP_CONCAT(JSON_OBJECT('store_name',location_name,'store_code',store_code,'contact_mobile',contact_mobile,'contact_email',contact_email,'address_line1',address_line1,'latitude',latitude,'longitude',longitude)),']'),'}') FROM sub_merchant_locations WHERE city_name = cityName)); 
            END IF;
        END LOOP cityLoop;
    CLOSE cityCursor;

    SELECT CONCAT('[',cityString,']') AS response;
END$$
DELIMITER ;  