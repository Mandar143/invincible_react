export interface Mobilenumberchange {
    id: number,
    sub_merchant_id: number,
    customer_loyalty_id: number,
    existing_mobile_number: string,
    new_mobile_number: string,
    requested_from: number,
    changed_from: number,
    created_by: number
}