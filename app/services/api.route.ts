export const API_CONSTANTS = {
  USER: {
REGISTER:"/register",
  VERIFY: "/verify?emailAddress={emailAddress}&deviceType={deviceType}",
  LOGIN:"/login",

  },
  TASK:{
    CREATE: "/tasks/",
    UPDATE: "/tasks/{taskId}",
    DELETE: "/tasks/{taskId}",
    GET_BY_ID: "/tasks/{taskId}",
      FILTER: "/tasks/filter",

  },
  LEAD:{
    CREATE: "/lead/create",
    GET_ALL:"/lead/fetch",
    UPDATE: "/lead/update",
  DELETE_BY_ID: "/lead/deleteLeadById",
   GET_BY_ID: "/lead/fetchLeadById",
     FILTER: "/lead/filter",

  }

}