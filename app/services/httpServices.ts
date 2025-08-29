import axios, { AxiosRequestConfig, AxiosError } from "axios";
import http from "../http-common";

export interface ApiError {
  generalMessage?: string;
  fieldErrors?: Record<string, string>;
}

function extractError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data;

    if (responseData?.fieldErrors) {
      const messages = Object.values(responseData.fieldErrors).join("\n");
      return new Error(messages);
    }

    return new Error(
      responseData?.errorMessage ||
        responseData?.message ||
        error.message ||
        "An unexpected error occurred"
    );
  }

  return new Error("An unexpected error occurred");
}

// GET Request
export const getRequest = async <T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const res = await http.get(url, config);
    return res.data;
  } catch (error) {
    throw extractError(error);
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
    throw extractError(error);
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
    throw extractError(error);
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
    throw extractError(error);
  }
};

// POST Request for FormData (File upload and multipart)
export const postRequestFormData = async <T>(
  url: string,
  data?: FormData | unknown,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    // For FormData, let browser set Content-Type automatically with boundary
    const updatedConfig: AxiosRequestConfig = {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': undefined, // Let browser set it
      },
    };

    const res = await http.post(url, data, updatedConfig);
    return res.data;
  } catch (error) {
    throw extractError(error);
  }
};

// PATCH Request
export const patchRequest = async <T>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<T> => {
  try {
    const res = await http.patch(url, data, config);
    return res.data;
  } catch (error) {
    throw extractError(error);
  }
};