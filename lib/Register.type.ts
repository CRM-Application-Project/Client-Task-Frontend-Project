// Types
interface RegisterRequestData {
  firstName: string;
  lastName: string;
  emailAddress: string;
  password: string;
  companyName: string;
  companyEmailAddress: string;
  companyContactNumber: string;
  gstNumber: string;
}

interface RegisterResponse {
  isSuccess: boolean;
  message: string;
  data: {
    statusCode: number;
    message: string;
  };
}

interface VerifyUserResponse {
  isSuccess: boolean;
  message: string;
  data: {
    tenantToken: string | null;
    accessRegion: string;
    deviceType: string;
  };
}


interface LoginRequestData {
  emailAddress: string;
  password: string;
  deviceType: string;
  accessRegion: string;
}

interface LoginResponse {
  isSuccess: boolean;
  message: string;
  data: {
    profileResponse: {
      firstName: string;
      lastName: string;
      emailAddress: string;
      phoneNumber: string | null;
      password: string;
      userRole: string;
    };
    authTokenResponse: {
      token: string | null;
      refreshToken: string | null;
    };
  };
}
