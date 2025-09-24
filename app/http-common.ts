import axios from "axios";

// export const BASE_URL = "http://localhost:8070/api/v1";
export const BASE_URL = "https://crm.seabed2crest.com/api/v1";


const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // This is the most important line
});

// Request interceptor
http.interceptors.request.use(
  (config) => {
    console.log('🔄 Axios Request:', {
      url: config.url,
      method: config.method,
      withCredentials: config.withCredentials,
      headers: config.headers
    });

    // Ensure headers are properly set
    config.headers = config.headers || {};
    
    // Set default headers if not provided
    if (!config.headers['Content-Type']) {
      config.headers['Content-Type'] = 'application/json';
    }
    if (!config.headers['Accept']) {
      config.headers['Accept'] = 'application/json, text/plain, */*';
    }

    // Ensure withCredentials is always true
    config.withCredentials = true;

    return config;
  },
  (error) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
http.interceptors.response.use(
  (response) => {
    console.log('✅ Axios Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      data: response.data
    });
    
    // Check for set-cookie headers
    if (response.headers['set-cookie']) {
      console.log('🍪 Cookies set:', response.headers['set-cookie']);
    }
    
    return response;
  },
  (error) => {
    console.error('❌ Response Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      headers: error.response?.headers,
      data: error.response?.data,
      message: error.message
    });

    if (error.response?.status === 401) {
      console.error('🔐 Authentication failed - 401 Unauthorized');
      // You can redirect to login page or show notification here
    } else if (error.response?.status === 403) {
      console.error('🚫 Access forbidden - 403 Forbidden');
    } else if (error.code === 'NETWORK_ERROR') {
      console.error('🌐 Network error - check server connection');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('🔌 Connection refused - is server running?');
    }

    return Promise.reject(error);
  }
);

export default http;