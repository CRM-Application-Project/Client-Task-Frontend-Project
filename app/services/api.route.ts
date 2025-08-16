export const API_CONSTANTS = {
  USER: {
    REGISTER: "/register",
    VERIFY: "/verify?emailAddress={emailAddress}&deviceType={deviceType}",
    LOGIN: "/login",
  },
  DEPARTMENT: {
    CREATE_DEPARTMENT: "/tenant/departments/",
    GET_DEPARTMENTS: "/tenant/departments/",
    GET_DEPARTMENT: (id: number) => `/tenant/departments/${id}`,
    UPDATE_DEPARTMENT: (id: number) => `/tenant/departments/${id}`,
    DELETE_DEPARTMENT: (id: number) => `/tenant/departments/${id}`,
  },
  STAFF: {
    CREATE_USER: "/tenant/users/",
    GET_USERS: "/tenant/users/",
  },
  MODULE: {
    MODULE_DROPDOWN: "/tenant/modules/dropdown",
  },
  TASK: {
    CREATE: "/tasks/",
    UPDATE: "/tasks/{taskId}",
    DELETE: "/tasks/{taskId}",
    GET_BY_ID: "/tasks/{taskId}",
    FILTER: "/tasks/filter",
  },
};
