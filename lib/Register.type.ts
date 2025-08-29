// Types
interface WhiteLabelData {
  topBanner: {
    textColor: string;
    backgroundColor: string;
  };
  description: string;
  brandSettings: {
    textColor: string;
    primaryColor: string;
    headerBgColor: string;
    secondaryColor: string;
    backgroundColor: string;
    headerTextColor: string;
  };
}

interface VerifyUserResponse {
  isSuccess: boolean;
  message: string;
  data: {
    tenantToken: string | null;
    accessRegion: string;
    deviceType: string;
    logoUrl: string;
    whiteLabelData: WhiteLabelData;
  };
}
