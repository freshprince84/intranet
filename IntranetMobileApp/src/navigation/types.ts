/**
 * Navigationstypen für die App
 */

// Definiert die Parameter für jeden Screen in der Hauptnavigation
export type RootStackParamList = {
  // Haupttabs
  Home: undefined;
  Worktime: undefined;
  Profile: undefined;
  Dashboard: undefined;
  
  // Sonstige Screens
  Notifications: undefined;
  Settings: undefined;
  Login: undefined;
  
  // Modals
  UserPicker: {
    onSelect: (userId: number) => void;
    selectedId?: number;
  };
  BranchPicker: {
    onSelect: (branchId: number) => void;
    selectedId?: number;
  };
  RolePicker: {
    onSelect: (roleId: number) => void;
    selectedId?: number;
  };
  DatePicker: {
    onSelect: (date: Date) => void;
    selectedDate?: Date;
    title?: string;
  };
}; 