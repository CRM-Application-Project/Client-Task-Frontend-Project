import { API_CONSTANTS } from "./api.route";
import { getRequest, postRequest } from "./httpServices";

export const registerUser = async (
  registerData: RegisterRequestData
): Promise<RegisterResponse> => {
  const res = await postRequest(API_CONSTANTS.USER.REGISTER, registerData);
  return res as RegisterResponse;
};

export const verifyUser = async (
  emailAddress: string,
  deviceType: string = "web"
): Promise<VerifyUserResponse> => {
  const url = API_CONSTANTS.USER.VERIFY
    .replace("{emailAddress}", encodeURIComponent(emailAddress))
    .replace("{deviceType}", deviceType);

  const res = await getRequest(url);
  return res as VerifyUserResponse;
};


export const loginUser = async (
  loginData: LoginRequestData
): Promise<LoginResponse> => {
  const res = await postRequest(API_CONSTANTS.USER.LOGIN, loginData);
  return res as LoginResponse;
};

