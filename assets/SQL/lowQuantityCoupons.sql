 DELIMITER $$
    DROP PROCEDURE IF EXISTS lowQuantityCoupons$$
CREATE DEFINER=`web`@`%` PROCEDURE `lowQuantityCoupons`()
lowQuantityCoupons:BEGIN
            DECLARE notFound INTEGER DEFAULT 0;
            DECLARE couponFor,subMerchantId,custLoyaltyId INTEGER;
            DECLARE usedCouponPercentage INTEGER DEFAULT 0;
            DECLARE lowQuantityArray JSON DEFAULT JSON_ARRAY();
			                       
			DECLARE cust CURSOR FOR
			SELECT coupon_for FROM crocs_loyalty_engine.pre_populated_coupons  where coupon_used = 1 AND status=1  group by coupon_for ;
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
            
            OPEN cust;
            orderLoop : LOOP
				FETCH cust INTO couponFor;
				IF(notFound = 1) THEN
					LEAVE orderLoop;
				END IF;
                
                SET usedCouponPercentage = ROUND(((SELECT COUNT(*) FROM pre_populated_coupons WHERE coupon_for = couponFor AND coupon_used = 1 AND status = 1) / (SELECT COUNT(*) FROM pre_populated_coupons WHERE coupon_for = couponFor AND status = 1)) * 100);
                                      
                IF usedCouponPercentage >= 70 THEN
                    SET lowQuantityArray = JSON_ARRAY_APPEND(lowQuantityArray,'$',JSON_OBJECT('couponFor',couponFor,'percentageCoupons',usedCouponPercentage,'flag',0));
			    ELSE 
					SET lowQuantityArray = JSON_ARRAY_APPEND(lowQuantityArray,'$',JSON_OBJECT('couponFor',couponFor,'percentageCoupons',usedCouponPercentage,'flag',0));
                END IF;                
		    END LOOP orderLoop;
			
            SELECT lowQuantityArray AS response;
            LEAVE lowQuantityCoupons;
            
        END$$
    DELIMITER ;  