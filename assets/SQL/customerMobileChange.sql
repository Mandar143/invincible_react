    DELIMITER $$
    DROP PROCEDURE IF EXISTS customerMobileChange$$
  CREATE DEFINER=`web`@`%` PROCEDURE `customerMobileChange`()
customerMobileChange:BEGIN
            DECLARE notFound INTEGER DEFAULT 0;
            DECLARE changeMobileNumberId,subMerchantId,custLoyaltyId INTEGER;
            DECLARE existingMobileNumber,newMobileNumber VARCHAR(20) DEFAULT NULL;

			DECLARE cust CURSOR FOR
            SELECT id,sub_merchant_id,customer_loyalty_id,existing_mobile_number,new_mobile_number 
            FROM `customer_mobile_number_change_log` WHERE status=1 AND created_at >= (now() - INTERVAL 1 DAY);
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
            
            OPEN cust;
            orderLoop : LOOP
				FETCH cust INTO changeMobileNumberId,subMerchantId,custLoyaltyId,existingMobileNumber,newMobileNumber;
				IF(notFound = 1) THEN
					LEAVE orderLoop;
				END IF;
                
                UPDATE customer_mobile_number_change_log SET status = 2 WHERE id = changeMobileNumberId AND status = 1;
                
                IF ROW_COUNT() > 0 THEN
					UPDATE customer_loyalty SET mobile_number = newMobileNumber WHERE id = custLoyaltyId;
                END IF;
                
                SELECT CONCAT('[',JSON_OBJECT('changeMobileNumberId',changeMobileNumberId,'subMerchantId',subMerchantId,'custLoyaltyId',custLoyaltyId,'existingMobileNumber',existingMobileNumber,'newMobileNumber',newMobileNumber),']');
                LEAVE customerMobileChange;
                
		    END LOOP orderLoop;
    
        END$$
    DELIMITER ;  