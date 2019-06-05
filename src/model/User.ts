export interface User {

  id?: number;
  first_name?: string;
  user_type_id?: number;
  last_name?: string;
  email_address?: string;
  mobile_number?: number;
  contact?: number;
  gender?: number;
  status?: number;// 0 = Active | 1 = Inactive
  avatar?: string;
  type?: number;
  otp?: number;
  date_of_birth?: any;
  marital_status?: number;
  anniversary_date?: any;
  spouse_dob?: any;
  username?: string;
  password?: string;
  isLoggedin?: Boolean;
  sub_merchant_id?: number;
  sub_merchant_location_id?: number;
  email?: string;
  created_by?: number;
  isAllowRegister?: boolean;
  loginTime?: number;
  isRegister?: number; // 0 - new user, 201 existisng user but profile incomplete
  token?: string;
  isMerchant?: boolean;
  isCustomer?: boolean;
  actions: any;
  user_id: number;
  home_branch_id?: number | null;
}
