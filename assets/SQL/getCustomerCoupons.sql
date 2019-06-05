DELIMITER $$
DROP PROCEDURE IF EXISTS getCustomerCoupons$$
CREATE PROCEDURE getCustomerCoupons(IN customerDetailsInput JSON)
    getCustomerCoupons:BEGIN
        DECLARE customerId, merchantId,subMerchantId, milestoneSequence, currentMilestoneId,currentPurchaseValue,locationCount,pageNo, notFoundCampaign,notFoundMilstone1,notFoundMilestone2,couponUsed INTEGER(10) DEFAULT 0;
        DECLARE campaignCouponsUtilized,campaignCouponsUnused,campaignOffer, milestoneVouchersUtilized, milestoneVouchersUnused, milestoneVouchersLocked, milestoneVoucher JSON DEFAULT JSON_OBJECT();
        DECLARE mobileNumber,subTitle,voucherCode VARCHAR(255) DEFAULT '';
        IF customerDetailsInput IS NOT NULL AND JSON_VALID(customerDetailsInput) = 0 THEN
            SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Please provide valid data.','data',JSON_OBJECT(),'statusCode',520) AS response;
            LEAVE getCustomerCoupons;
        ELSE
            SET mobileNumber = JSON_UNQUOTE(JSON_EXTRACT(customerDetailsInput,'$.mobile_number'));
            SET merchantId = JSON_UNQUOTE(JSON_EXTRACT(customerDetailsInput,'$.merchant_id'));
            -- SET pageNo = JSON_UNQUOTE(JSON_EXTRACT(customerDetailsInput,'$.page_no'));
            IF mobileNumber IS NULL OR merchantId IS NULL THEN
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Something missing in input of getCustomerCoupons.','data',JSON_OBJECT(),'statusCode',520) AS response;
                LEAVE getCustomerCoupons;
            END IF;
        END IF;
        IF EXISTS(SELECT id FROM customer_loyalty WHERE mobile_number = mobileNumber AND merchant_id = merchantId) THEN            
            SELECT cl.id, cl.current_milestone_id,cl.current_purchase_value,mlpm.sequence 
            INTO customerId, currentMilestoneId, currentPurchaseValue, milestoneSequence
            FROM customer_loyalty AS cl
            JOIN merchant_loyalty_program_milestones AS mlpm ON mlpm.id = cl.current_milestone_id  
            WHERE cl.mobile_number = mobileNumber AND cl.merchant_id = merchantId; 
    -- OFFERS
            innerBlock:BEGIN
                DECLARE campaignOffer CURSOR FOR
                SELECT JSON_OBJECT('id',mc.id, 'voucher_code', mc.coupon_code,'expiry_date', mc.coupon_end_date,'expiry_in_days', DATEDIFF(mc.coupon_end_date,CURDATE()), 'voucher_value', mcrv.reward_type_x_value,
                'reward_type',mcrv.reward_type, 'coupon_used', coupon_used,'voucher_title',mcm.campaign_title,'card_type',mcoc.card_type,
                'card_image_path',mcoc.card_image_path,'background_color',mcoc.background_color,'font_color',mcoc.font_color,'logo_path',mcoc.logo_path,
                'card_title',title,'card_sub_title',sub_title,'card_description',mcoc.description), mc.coupon_used, mcm.sub_merchant_id              
                FROM merchant_coupons AS mc
                JOIN merchant_campaign_reward_values AS mcrv ON mcrv.id = mc.merchant_campaign_reward_values_id
                JOIN merchant_campaigns AS mcm ON mcm.id = mc.merchant_campaigns_id
                JOIN merchant_campaigns_offer_cards AS mcoc ON mcoc.merchant_campaigns_id = mcm.id
                WHERE mc.customer_loyalty_id = customerId
                AND mc.coupon_code != ''
                ORDER BY mc.created_at DESC;

                DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFoundCampaign = 1;
                
                SET campaignCouponsUtilized = JSON_ARRAY(), campaignCouponsUnused = JSON_ARRAY();
                
                OPEN campaignOffer;
                    campaignOfferLoop: LOOP
                        FETCH campaignOffer INTO campaignOffer,couponUsed,subMerchantId;
                        IF notFoundCampaign = 1 THEN
                            LEAVE campaignOfferLoop;
                        END IF;
                        IF couponUsed= 1 THEN
                            SET campaignCouponsUtilized = JSON_ARRAY_APPEND(campaignCouponsUtilized,'$',campaignOffer); 
                        ELSE
                            SELECT COUNT(*) INTO @locations FROM sub_merchant_locations WHERE sub_merchant_id = subMerchantId;
                            SET campaignOffer = JSON_SET(campaignOffer,'$.locations',@locations);
                            SET campaignCouponsUnused = JSON_ARRAY_APPEND(campaignCouponsUnused,'$',campaignOffer); 
                        END IF;                     
                    END LOOP campaignOfferLoop;
                CLOSE campaignOffer;
            END innerBlock;
--  UTILISED AND UNUSED VOUCHERS
            innerBlock2:BEGIN
                DECLARE milestoneVoucher CURSOR FOR
                SELECT JSON_OBJECT('id',cm.id, 'voucher_code', cm.voucher_code,'expiry_in_days', DATEDIFF(cm.expiry_date,CURDATE()), 'voucher_value', cm.voucher_value,
                'coupon_used', cm.coupon_used,'voucher_title',CONCAT('Milestone ',(mlpm.sequence - 1)),'voucher_subtitle','', 'purchase_value',cm.purchase_value), 
                cm.coupon_used,cm.voucher_code
                FROM customer_milestones AS cm
                JOIN merchant_loyalty_program_milestones AS mlpm ON mlpm.id = cm.milestone_id           
                WHERE cm.customer_loyalty_id = customerId
                AND cm.expiry_date >= CURDATE()
                ORDER BY cm.created_at DESC;

                DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFoundMilstone1 = 1;
                
                SET milestoneVouchersUtilized = JSON_ARRAY(), milestoneVouchersUnused = JSON_ARRAY();
                
                OPEN milestoneVoucher;
                    milestoneVoucherLoop: LOOP
                        FETCH milestoneVoucher INTO milestoneVoucher,couponUsed,voucherCode;
                        IF notFoundMilstone1 = 1 THEN
                            LEAVE milestoneVoucherLoop;
                        END IF;
                        IF couponUsed = 1 THEN
                            SELECT CONCAT('used at ',sml.location_name,' for invoice #',co.order_number,' on date ',DATE_FORMAT(co.order_date,'%d-%m-%Y'))
                            INTO subTitle
                            FROM customer_orders AS co 
                            JOIN sub_merchant_locations AS sml ON sml.id = co.location_id
                            WHERE co.voucher_applied = voucherCode ;

                            SET milestoneVoucher = JSON_SET(milestoneVoucher,'$.voucher_subtitle',subTitle);
                            SET milestoneVouchersUtilized = JSON_ARRAY_APPEND(milestoneVouchersUtilized,'$',milestoneVoucher); 
                        ELSE
                            SET milestoneVouchersUnused = JSON_ARRAY_APPEND(milestoneVouchersUnused,'$',milestoneVoucher); 
                        END IF;                      
                    END LOOP milestoneVoucherLoop;
                CLOSE milestoneVoucher;
            END innerBlock2;

            --  LOCKED VOUCHERS
            innerBlock3:BEGIN
                DECLARE milestoneLocked CURSOR FOR
                SELECT JSON_OBJECT('id',id, 'voucher_title',CONCAT('Milestone ',(sequence - 1)),'voucher_subtitle','', 'away_from_value',(milestone_reach_at - currentPurchaseValue))
                FROM merchant_loyalty_program_milestones        
                WHERE sequence > milestoneSequence
                ORDER BY sequence ASC;

                DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFoundMilestone2 = 1;
                
                SET milestoneVouchersLocked  = JSON_ARRAY();
                
                OPEN milestoneLocked;
                    milestoneLockedLoop: LOOP
                        FETCH milestoneLocked INTO milestoneVoucher;
                        IF notFoundMilestone2 = 1 THEN
                            LEAVE milestoneLockedLoop;
                        END IF;
                        SET milestoneVouchersLocked = JSON_ARRAY_APPEND(milestoneVouchersLocked,'$',milestoneVoucher);                        
                    END LOOP milestoneLockedLoop;
                CLOSE milestoneLocked;
            END innerBlock3;

            SELECT JSON_OBJECT('status','SUCCESS', 'message','Customer Voucher/Coupons details.','data',JSON_OBJECT('coupons',JSON_OBJECT('utilized',campaignCouponsUtilized,'unused',campaignCouponsUnused),'vouchers',JSON_OBJECT('utilized', milestoneVouchersUtilized,'unused', milestoneVouchersUnused,'locked', milestoneVouchersLocked)), 'statusCode',200) AS response;
            LEAVE getCustomerCoupons;
        ELSE
            SELECT JSON_OBJECT('status','SUCCESS', 'message','No record found.','data',JSON_OBJECT('statusCode',104),'statusCode',104) AS response;
            LEAVE getCustomerCoupons;
        END IF;       
    END$$
DELIMITER ;