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

// types/auth.ts
