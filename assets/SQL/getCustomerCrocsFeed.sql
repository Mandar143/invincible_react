DELIMITER $$
DROP PROCEDURE IF EXISTS getCustomerCrocsFeed$$
CREATE PROCEDURE getCustomerCrocsFeed(IN customerDetailsInput JSON)
    getCustomerCrocsFeed:BEGIN
        DECLARE customerId, merchantId, homeBranchId, currentMilestoneId,locationCount,pageNo, notFound INTEGER(10) DEFAULT 0;
        DECLARE campaignOffers,campaignOffer JSON DEFAULT JSON_OBJECT();
        DECLARE mobileNumber VARCHAR(20) DEFAULT '';
        IF customerDetailsInput IS NOT NULL AND JSON_VALID(customerDetailsInput) = 0 THEN
            SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Please provide valid data.','data',JSON_OBJECT(),'statusCode',520) AS response;
            LEAVE getCustomerCrocsFeed;
        ELSE
            SET mobileNumber = JSON_UNQUOTE(JSON_EXTRACT(customerDetailsInput,'$.mobile_number'));
            SET merchantId = JSON_UNQUOTE(JSON_EXTRACT(customerDetailsInput,'$.merchant_id'));
            -- SET pageNo = JSON_UNQUOTE(JSON_EXTRACT(customerDetailsInput,'$.page_no'));
            IF mobileNumber IS NULL OR merchantId IS NULL THEN
                SELECT JSON_OBJECT('status', 'FAILURE', 'message', 'Something missing in input of getCustomerCrocsFeed.','data',JSON_OBJECT(),'statusCode',520) AS response;
                LEAVE getCustomerCrocsFeed;
            END IF;
        END IF;
        IF EXISTS(SELECT id FROM customer_loyalty WHERE mobile_number = mobileNumber AND merchant_id = merchantId) THEN            
            SELECT id INTO customerId
            FROM customer_loyalty
            WHERE mobile_number = mobileNumber AND merchant_id = merchantId; 

            innerBlock:BEGIN
                DECLARE campaignOffer CURSOR FOR
                SELECT JSON_OBJECT('id',mc.id, 'voucher_code', mc.coupon_code,'expiry_date', mc.coupon_end_date, 'voucher_value', mcrv.reward_type_x_value,
                'reward_type',mcrv.reward_type, 'coupon_used', coupon_used,'voucher_title',mcm.campaign_title,'card_type',mcoc.card_type,
                'card_image_path',mcoc.card_image_path,'background_color',mcoc.background_color,'font_color',mcoc.font_color,'logo_path',mcoc.logo_path,
                'card_title',title,'card_sub_title',sub_title,'card_description',mcoc.description)                
                FROM merchant_coupons AS mc
                JOIN merchant_campaign_reward_values AS mcrv ON mcrv.id = mc.merchant_campaign_reward_values_id
                JOIN merchant_campaigns AS mcm ON mcm.id = mc.merchant_campaigns_id
                JOIN merchant_campaigns_offer_cards AS mcoc ON mcoc.merchant_campaigns_id = mcm.id
                WHERE mc.customer_loyalty_id = customerId
                AND mc.coupon_used = 0 
                ORDER BY mc.created_at DESC;

                DECLARE CONTINUE HANDLER FOR NOT FOUND SET notFound = 1;
                
                SET campaignOffers = JSON_ARRAY();
                
                OPEN campaignOffer;
                    campaignOfferLoop: LOOP
                        FETCH campaignOffer INTO campaignOffer;
                        IF notFound = 1 THEN
                            LEAVE campaignOfferLoop;
                        END IF;
                        SET campaignOffers = JSON_ARRAY_APPEND(campaignOffers,'$',campaignOffer); 
                    END LOOP campaignOfferLoop;
                CLOSE campaignOffer;
            END innerBlock;
            SELECT JSON_OBJECT('status','SUCCESS', 'message','Customer Crocs Feed details.','data',JSON_OBJECT('my_crocs_feed',campaignOffers), 'statusCode',200) AS response;
            LEAVE getCustomerCrocsFeed;
        ELSE
            SELECT JSON_OBJECT('status','SUCCESS', 'message','No record found.','data',JSON_OBJECT('statusCode',104),'statusCode',104) AS response;
            LEAVE getCustomerCrocsFeed;
        END IF;       
    END$$
DELIMITER ;