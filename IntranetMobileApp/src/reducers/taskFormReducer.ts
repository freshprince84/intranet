import { Task, TaskFormState, TaskStatus, User, Branch } from '../types';

export type TaskFormAction = 
  | { type: 'SET_FIELD'; field: keyof TaskFormData; value: any }
  | { type: 'RESET_FORM' }
  | { type: 'LOAD_TASK'; task: Task }
  | { type: 'SET_LOADING'; value: boolean }
  | { type: 'SET_UPDATING'; value: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_FORM_ERROR'; error: string | null }
  | { type: 'TOGGLE_UI'; key: keyof TaskFormState['ui'] }
  | { type: 'SET_UI'; key: keyof TaskFormState['ui']; value: boolean }
  | { type: 'SET_USERS'; users: User[] }
  | { type: 'SET_BRANCHES'; branches: Branch[] }
  | { type: 'SET_SELECTED_USER'; user: User | null }
  | { type: 'SET_SELECTED_BRANCH'; branch: Branch | null }
  | { type: 'VALIDATE_FORM' };

export const initialFormState: TaskFormState = {
  // Form data
  title: '',
  description: '',
  status: 'open' as TaskStatus,
  dueDate: null,
  responsibleId: null,
  branchId: null,
  
  // Status flags
  isLoading: false,
  isUpdating: false,
  error: null,
  formError: null,
  
  // UI state
  ui: {
    showDatePicker: false,
    showUserMenu: false,
    showBranchMenu: false,
    showConfirmationDialog: false,
  },
  
  // Data state
  data: {
    users: [],
    branches: [],
    selectedUser: null,
    selectedBranch: null,
  }
};

const validateForm = (state: TaskFormState): string | null => {
  if (!state.title.trim()) {
    return 'Bitte geben Sie einen Titel ein.';
  }
  
  if (!state.branchId) {
    return 'Bitte wählen Sie eine Branch aus.';
  }
  
  return null;
};

export const taskFormReducer = (state: TaskFormState, action: TaskFormAction): TaskFormState => {
  switch (action.type) {
    case 'SET_FIELD': {
      const newState = { ...state, [action.field]: action.value };
      
      // Automatische Validierung bei Änderungen
      const formError = validateForm(newState);
      return { ...newState, formError };
    }
    
    case 'RESET_FORM':
      return { 
        ...initialFormState,
        data: {
          ...state.data,
          users: state.data.users,
          branches: state.data.branches
        }
      };
    
    case 'LOAD_TASK':
      return {
        ...state,
        title: action.task.title,
        description: action.task.description || '',
        status: action.task.status,
        dueDate: action.task.dueDate ? new Date(action.task.dueDate) : null,
        responsibleId: action.task.responsible?.id || null,
        branchId: action.task.branch?.id || null,
        data: {
          ...state.data,
          selectedUser: action.task.responsible || null,
          selectedBranch: action.task.branch || null
        },
        error: null,
        formError: null
      };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.value };
    
    case 'SET_UPDATING':
      return { ...state, isUpdating: action.value };
    
    case 'SET_ERROR':
      return { ...state, error: action.error };
    
    case 'SET_FORM_ERROR':
      return { ...state, formError: action.error };
    
    case 'TOGGLE_UI':
      return {
        ...state,
        ui: {
          ...state.ui,
          [action.key]: !state.ui[action.key]
        }
      };
    
    case 'SET_UI':
      return {
        ...state,
        ui: {
          ...state.ui,
          [action.key]: action.value
        }
      };
    
    case 'SET_USERS':
      return {
        ...state,
        data: {
          ...state.data,
          users: action.users
        }
      };
    
    case 'SET_BRANCHES':
      return {
        ...state,
        data: {
          ...state.data,
          branches: action.branches
        }
      };
    
    case 'SET_SELECTED_USER':
      return {
        ...state,
        responsibleId: action.user?.id || null,
        data: {
          ...state.data,
          selectedUser: action.user
        }
      };
    
    case 'SET_SELECTED_BRANCH':
      return {
        ...state,
        branchId: action.branch?.id || null,
        data: {
          ...state.data,
          selectedBranch: action.branch
        }
      };
    
    case 'VALIDATE_FORM':
      return {
        ...state,
        formError: validateForm(state)
      };
    
    default:
      return state;
  }
}; 