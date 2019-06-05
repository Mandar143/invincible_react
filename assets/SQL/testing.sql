DELIMITER $$
DROP PROCEDURE IF EXISTS testing$$
CREATE PROCEDURE testing()
    testing:BEGIN
        -- VARIAABLE DECLARATION START
        DECLARE orderNotFound INTEGER DEFAULT 0;
        DECLARE mobileNumber VARCHAR (20) DEFAULT '';
        DECLARE outputData,arrayCheck JSON DEFAULT JSON_ARRAY();
        -- VARIABLE DECLARATION END
        -- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        -- CURSOR DECLARATION START
        DECLARE customerOrderCursor CURSOR FOR 
        SELECT mobile_number
        FROM customer_orders;

        DECLARE CONTINUE HANDLER FOR NOT FOUND SET orderNotFound = 1;
        -- CURSOR DECLARATION END
        -- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        -- CURSOR ITERATION START
        START TRANSACTION;
        OPEN customerOrderCursor;
            getOrders: LOOP
                FETCH customerOrderCursor INTO  mobileNumber;
                IF orderNotFound = 1 THEN 
                    LEAVE getOrders;
                END IF;
                    IF JSON_SEARCH(outputData, 'one', mobileNumber) IS NULL THEN
					    SET outputData = JSON_ARRAY_APPEND(outputData,'$',JSON_OBJECT('mobile_number',mobileNumber,'mobile_verified',1));	
                        SET arrayCheck = JSON_ARRAY_APPEND(arrayCheck,'$',mobileNumber);
                    END IF;		
                    select outputData,arrayCheck;
            END LOOP getOrders;
        CLOSE customerOrderCursor;
        -- CURSOR ITERATION END
        -- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------        
        COMMIT;
        -- SELECT outputData AS response;
    END$$
DELIMITER ;