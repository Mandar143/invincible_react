DELIMITER $$
DROP PROCEDURE IF EXISTS `getCampaignReportROI`$$
CREATE PROCEDURE `getCampaignReportROI`(IN inputData JSON)
getCampaignReportROI:BEGIN

DECLARE campaignId,merchantCampaignsId,contactedCustomersCount,respondingCustomers,
		couponIssued,couponRedeemed,responderTxns,subMerchantId,couponRedeemedTxns,couponRedeemedCustomersCount INTEGER DEFAULT 0;
DECLARE redeemedCouponCodes,campaignTitle,contactedCustomers,couponRedeemedCustomers VARCHAR(255) DEFAULT NULL;
DECLARE redemptionRevenue,responderSales,responderAtv,responderAbv,hitRate DECIMAL (14,2) DEFAULT 0;
DECLARE startDate,endDate VARCHAR(20) DEFAULT NULL;
DECLARE campStartDate,campEndDate,customEndDate DATE DEFAULT NULL;

	SET subMerchantId = JSON_EXTRACT(inputData, '$.sub_merchant_id');
	SET campaignId = JSON_EXTRACT(inputData, '$.campaign_id');
	SET startDate = JSON_UNQUOTE(JSON_EXTRACT(inputData, '$.start_date'));
	SET endDate = JSON_UNQUOTE(JSON_EXTRACT(inputData, '$.end_date'));

	IF (SELECT IFNULL(NULL, DATE(startDate))) IS NULL THEN
		SELECT JSON_OBJECT('status','FAILURE','message','Incorrect start date value.','data',JSON_OBJECT(),'statusCode',103) AS response;
		LEAVE getCampaignReportROI;
	END IF;

	IF (SELECT IFNULL(NULL, DATE(endDate))) IS NULL THEN
		SELECT JSON_OBJECT('status','FAILURE','message','Incorrect end date value.','data',JSON_OBJECT(),'statusCode',103) AS response;
		LEAVE getCampaignReportROI;
	END IF;

	SELECT id,campaign_title,campaign_start_date,campaign_end_date INTO merchantCampaignsId,campaignTitle,campStartDate,campEndDate FROM merchant_campaigns WHERE campaign_id = campaignId;

	IF merchantCampaignsId > 0 THEN
		SELECT COUNT(*), COUNT(*),GROUP_CONCAT(customer_loyalty_id) INTO contactedCustomersCount,couponIssued,contactedCustomers FROM merchant_coupons mcou LEFT JOIN customer_loyalty cl ON mcou.customer_loyalty_id = cl.id
		WHERE mcou.merchant_campaigns_id = merchantCampaignsId AND date_format(mcou.created_at, '%Y-%m-%d') between startDate AND endDate AND (cl.sub_merchant_id = subMerchantId OR cl.sub_merchant_id IS NULL);

		IF contactedCustomersCount > 0 THEN

			SELECT COUNT(*),GROUP_CONCAT(coupon_code) INTO couponRedeemed,redeemedCouponCodes
			FROM merchant_coupons
			WHERE FIND_IN_SET (customer_loyalty_id,contactedCustomers) AND merchant_campaigns_id = merchantCampaignsId AND coupon_used = 1;

			IF couponRedeemed > 0 THEN
				SELECT IFNULL(round(SUM(calculated_amount), 2), 0), COUNT(*), GROUP_CONCAT(DISTINCT(customer_loyalty_id)), COUNT(DISTINCT(customer_loyalty_id)) INTO redemptionRevenue,couponRedeemedTxns,couponRedeemedCustomers,couponRedeemedCustomersCount
				FROM customer_orders
				WHERE FIND_IN_SET (voucher_applied,redeemedCouponCodes) AND processed = 1;
			END IF;

			SELECT IF(campEndDate > endDate, endDate, campEndDate) INTO customEndDate;

			SELECT IFNULL(round(SUM(calculated_amount), 2), 0), COUNT(*), COUNT(DISTINCT(customer_loyalty_id)) INTO responderSales,responderTxns,respondingCustomers
			FROM customer_orders
			WHERE FIND_IN_SET (customer_loyalty_id,contactedCustomers)
				AND id NOT IN (SELECT id FROM customer_orders WHERE FIND_IN_SET (voucher_applied,redeemedCouponCodes) AND processed = 1)
				AND (order_date BETWEEN startDate AND customEndDate) AND processed = 1;

			/* SELECT COUNT(DISTINCT(customer_loyalty_id)) INTO respondingCustomers
			FROM customer_orders
			WHERE FIND_IN_SET (customer_loyalty_id,contactedCustomers) AND IF(couponRedeemedCustomers IS NOT NULL, FIND_IN_SET (customer_loyalty_id,couponRedeemedCustomers) = false, 1=1)
				AND id NOT IN (SELECT id FROM customer_orders WHERE FIND_IN_SET (voucher_applied,redeemedCouponCodes) AND processed = 1)
				AND (order_date BETWEEN campStartDate AND customEndDate) AND processed = 1; */

			SET responderSales = round(responderSales + redemptionRevenue, 2);
			SET responderTxns = responderTxns + couponRedeemedTxns;
			IF responderTxns > 0 THEN
				SET responderAtv = round(responderSales / responderTxns, 2);
			END IF;
			SET respondingCustomers = respondingCustomers + couponRedeemedCustomersCount;

			IF respondingCustomers > 0 THEN
				SET responderAbv = responderSales / respondingCustomers;
			END IF;
			SET hitRate = round((respondingCustomers / contactedCustomersCount) * 100, 2);

			SELECT JSON_OBJECT('status','SUCCESS', 'message', 'Campaign ROI.',
			'data',JSON_OBJECT('statusCode',200,'campaign_title',campaignTitle,'contacted_customers',
			contactedCustomersCount,'responding_customers',respondingCustomers,'coupon_issued',
			couponIssued,'coupon_redeemed',couponRedeemed,'redemption_revenue',redemptionRevenue,
			'responder_sales',responderSales,'responder_txns',responderTxns,'responder_atv',
			responderAtv,'responder_abv',responderAbv,'hit_rate',hitRate),'statusCode',200) AS response;
			LEAVE getCampaignReportROI;

		ELSE
			SELECT JSON_OBJECT('status','SUCCESS','message','Customer not found.','data',JSON_OBJECT(),'statusCode',102) AS response;
			LEAVE getCampaignReportROI;
		END IF;

	ELSE
		SELECT JSON_OBJECT('status','SUCCESS','message','Record not found.','data',JSON_OBJECT(),'statusCode',101) AS response;
		LEAVE getCampaignReportROI;
	END IF;

END$$
DELIMITER ;