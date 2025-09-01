import "./globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/hooks/Providers";
import { headers } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

// API call function (modified to use headers instead of URL params)
async function verifyUser(
  subDomainName: string,
  deviceType: string = "web"
): Promise<any> {
  const baseUrl = "https://dev.crm.seabed2crest.com/api/v1/verify";

  // Append query params
  const url = `${baseUrl}?deviceType=${encodeURIComponent(deviceType)}&subDomainName=${encodeURIComponent(subDomainName)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        // You may also need to pass cookies or tokens here if required
        // 'Cookie': 'refresh-token=...; tenant-token=...'
      },
    });

    console.log("Verify user response:", res);

    if (!res.ok) {
      throw new Error("Failed to verify user");
    }

    return await res.json();
  } catch (error) {
    console.error("Verify user error:", error);
    return {
      isSuccess: false,
      message: "Failed to verify user",
      data: null,
    };
  }
}


// Function to extract subdomain from host
function getSubdomain(host: string): string {
  // Remove port number if present
  const hostWithoutPort = host.split(':')[0];
  
  // Handle localhost and IP addresses
  if (hostWithoutPort.includes('localhost') || 
      hostWithoutPort.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    // For local development, check if it has a subdomain prefix
    const parts = hostWithoutPort.split('.');
    if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'localhost') {
      return parts[0]; // Return the subdomain part
    }
    return 'seabed2crest'; // Default for local development
  }
  
  // For production domains with subdomains
  const parts = hostWithoutPort.split('.');
  if (parts.length > 2) {
    return parts[0]; // Return the subdomain part
  }
  
  return 'seabed2crest'; // Default if no subdomain detected
}

// Function to generate CSS variables from theme data
function generateThemeCSS(themeData: any) {
  if (!themeData) {
    return '';
  }

  const { primaryColor, secondaryColor, textColor, backgroundColor, headerBgColor, headerTextColor } = 
    themeData.brandSettings || {};

  // Helper function to adjust color brightness
  const adjustBrightness = (hex: string, percent: number): string => {
    // Remove # if present
    let color = hex.replace('#', '');
    
    // Parse r, g, b values
    let r = parseInt(color.substring(0, 2), 16);
    let g = parseInt(color.substring(2, 4), 16);
    let b = parseInt(color.substring(4, 6), 16);
    
    // Adjust brightness
    r = Math.max(0, Math.min(255, Math.round(r + (r * percent))));
    g = Math.max(0, Math.min(255, Math.round(g + (g * percent))));
    b = Math.max(0, Math.min(255, Math.round(b + (b * percent))));
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  const primary = primaryColor || '#3b3b3b';
  const secondary = secondaryColor || '#636363';
  const surface = backgroundColor || '#ffffff';
  const text = textColor || '#3b3b3b';
  const headerBg = headerBgColor || primary;
  const headerText = headerTextColor || surface;

  return `
    :root {
      /* Override base palette with brand colors */
      --color-primary: ${primary};
      --color-secondary: ${secondary};
      --color-accent: ${adjustBrightness(secondary, 0.3)};
      --color-surface: ${surface};
      
      /* Brand Palette */
      --brand-primary: ${primary};
      --brand-secondary: ${secondary};
      
      /* Text Colors */
      --text-primary: ${text};
      --text-secondary: ${adjustBrightness(text, 0.7)};
      
      /* Button Colors */
      --button-primary-background: ${primary};
      --button-primary-hover: ${adjustBrightness(primary, -0.2)};
      
      /* Background Colors */
      --background-primary: ${surface};
      
      /* Sidebar Colors */
      --sidebar-background: ${primary};
      --sidebar-foreground: ${headerText};
      
      /* Additional theme-specific overrides */
      --background: ${surface};
      --foreground: ${text};
      --card: ${surface};
      --card-foreground: ${text};
      --primary: ${primary};
      --primary-foreground: ${headerText};
      --input: ${adjustBrightness(primary, 0.85)};
    }
  `;
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let themeCSS = '';
  
  try {
    // Get headers for host information
    const headersList = headers();
    const host = headersList.get('host') || '';
    
    // Extract subdomain from host
    const subDomainName = getSubdomain(host);

    console.log(subDomainName);
    
    // Call verifyUser endpoint
    const verifyResponse = await verifyUser(subDomainName, "web");
    
    if (verifyResponse.isSuccess && verifyResponse.data && verifyResponse.data.whiteLabelData) {
      themeCSS = generateThemeCSS(verifyResponse.data.whiteLabelData);
    } else {
      // Fallback to default theme if API call fails
      themeCSS = generateThemeCSS(null);
    }
  } catch (error) {
    console.error('Failed to fetch theme data:', error);
    // Fallback to default theme
    themeCSS = generateThemeCSS(null);
  }

  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
