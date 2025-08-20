import { useEffect, useState } from 'react';

export interface UserModuleAccess {
  id: number;
  moduleId: number;
  moduleName: string;
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserPermissions {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canCreate: boolean;
}

export const usePermissions = (moduleName: string = 'task') => {
  const [permissions, setPermissions] = useState<UserPermissions>({
    canView: false,
    canEdit: false,
    canDelete: false,
    canCreate: false,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserPermissions = () => {
      try {
        // Try to get from localStorage first (from login)
        const currentUser = localStorage.getItem('currentUser');
        const userModules = localStorage.getItem('userModules');
        
        let moduleAccessList: UserModuleAccess[] = [];

        if (currentUser) {
          const userData = JSON.parse(currentUser);
          moduleAccessList = userData.userModuleAccessList || userData.modules || [];
        } else if (userModules) {
          moduleAccessList = JSON.parse(userModules);
        }

        // Find the specific module permissions
        const modulePermissions = moduleAccessList.find(
          (module: UserModuleAccess) => 
            module.moduleName?.toLowerCase() === moduleName.toLowerCase()
        );

        if (modulePermissions) {
          setPermissions({
            canView: modulePermissions.canView || false,
            canEdit: modulePermissions.canEdit || false,
            canDelete: modulePermissions.canDelete || false,
            canCreate: modulePermissions.canCreate || false,
          });
        } else {
          // Default permissions if module not found
          setPermissions({
            canView: false,
            canEdit: false,
            canDelete: false,
            canCreate: false,
          });
        }
      } catch (error) {
        console.error('Error loading permissions:', error);
        setPermissions({
          canView: false,
          canEdit: false,
          canDelete: false,
          canCreate: false,
        });
      } finally {
        setLoading(false);
      }
    };

    getUserPermissions();
  }, [moduleName]);

  return { permissions, loading };
};

// Utility function for direct permission checking
export const checkPermission = (moduleName: string, action: keyof UserPermissions): boolean => {
  try {
    const currentUser = localStorage.getItem('currentUser');
    const userModules = localStorage.getItem('userModules');
    
    let moduleAccessList: UserModuleAccess[] = [];

    if (currentUser) {
      const userData = JSON.parse(currentUser);
      moduleAccessList = userData.userModuleAccessList || userData.modules || [];
    } else if (userModules) {
      moduleAccessList = JSON.parse(userModules);
    }

    const modulePermissions = moduleAccessList.find(
      (module: UserModuleAccess) => 
        module.moduleName?.toLowerCase() === moduleName.toLowerCase()
    );

    return modulePermissions ? modulePermissions[action] || false : false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};