import { AxiosRequestConfig } from "axios";
import http from "../http-common";

// GET Request
export const getRequest = async <T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const res = await http.get(url, config);
    return res.data;
  } catch (error) {
    throw error;
  }
};

// POST Request (Generic)
export const postRequest = async <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const res = await http.post(url, data, config);
    return res.data;
  } catch (error) {
    throw error;
  }
};

// PUT Request (Generic)
export const putRequest = async <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const res = await http.put(url, data, config);
    return res.data;
  } catch (error) {
    throw error;
  }
};

// DELETE Request (Generic)
export const deleteRequest = async <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const res = await http.delete(url, {
      ...config,
      data,
    });
    return res.data;
  } catch (error) {
    throw error;
  }
};

// POST Request for FormData (File upload and multipart)
export const postRequestFormData = async <T>(
  url: string,
  data?: FormData | unknown,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const updatedConfig: AxiosRequestConfig = {
      ...config,
      headers: {
        ...config?.headers,
      },
    };

    const res = await http.post(url, data, updatedConfig);
    return res.data;
  } catch (error) {
    throw error;
  }
};
