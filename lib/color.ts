
// types/brand.ts
export interface BrandSettings {
  primaryColor: string;
  secondaryColor: string;
  headerBgColor: string;
  headerTextColor: string;
  textColor: string;
  backgroundColor: string;
}

export interface TopBanner {
  backgroundColor: string;
  textColor: string;
}

export interface Palette {
  logoColor: string;
  description: string;
  brandSettings: BrandSettings;
  topBanner: TopBanner;
}

export interface GenerateBrandResponse {
  isSuccess: boolean;
  message: string;
  data: {
    data: {
      palettes: Palette[];
    };
  };
}

export interface WhiteLabelRequest {
  description: string;
  brandSettings: BrandSettings;
  topBanner: TopBanner;
}

export interface RegisterRequestData {
  firstName: string;
  lastName: string;
  emailAddress: string;
  password: string;
  companyName: string;
  companyContactNumber: string;
  gstNumber: string;
  whiteLabelRequest?: WhiteLabelRequest;
}

export interface RegisterResponse {
  isSuccess: boolean;
  message: string;
  data: {
    statusCode: number;
    message: string;
  };
}