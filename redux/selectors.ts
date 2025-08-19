// features/user/selectors.ts

import { RootState } from "./store";


export const selectCurrentUser = (state: RootState) => state.user.currentUser;
export const selectIsAuthenticated = (state: RootState) => state.user.isAuthenticated;
export const selectAllUsers = (state: RootState) => state.user.allUsers;
export const selectUserModules = (state: RootState) => 
  state.user.currentUser?.modules || [];
  
export const selectHasModulePermission = (
  moduleName: string, 
  permission: 'canView' | 'canEdit' | 'canCreate' | 'canDelete'
) => (state: RootState) => {
  const module = state.user.currentUser?.modules.find(
    m => m.moduleName === moduleName
  );
  return module ? module[permission] : false;
};

export const selectUserRole = (state: RootState) => 
  state.user.currentUser?.userRole || '';