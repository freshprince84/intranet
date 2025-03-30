import { Task, TaskFormData, TaskFormState, TaskStatus, User, Branch, Role } from '../types';

export type TaskFormAction = 
  | { type: 'SET_FIELD'; field: keyof TaskFormState; value: any }
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
  title: '',
  description: '',
  status: 'open',
  dueDate: null,
  responsibleId: null,
  branchId: null,
  qualityControlId: null,
  roleId: null,
  isLoading: false,
  isUpdating: false,
  error: null,
  formError: null,
  ui: {
    showDatePicker: false,
    showUserMenu: false,
    showBranchMenu: false,
    showQcMenu: false,
    showConfirmationDialog: false,
  },
  data: {
    users: [],
    branches: [],
    selectedUser: null,
    selectedBranch: null,
  },
};

const validateForm = (state: TaskFormState): string | null => {
  // Titel prüfen
  if (!state.title.trim()) {
    return 'Bitte geben Sie einen Titel ein.';
  }

  // Branch prüfen
  if (!state.branchId) {
    return 'Bitte wählen Sie eine Filiale aus.'; // Korrekter Text
  }

  // Verantwortlichen prüfen (wichtig für Benutzer-Tasks)
  // TODO: Dies muss angepasst werden, wenn Rollen implementiert sind (entweder User ODER Rolle)
  if (!state.responsibleId) {
    return 'Bitte wählen Sie einen Verantwortlichen aus.';
  }

  // Wenn alles ok ist, null zurückgeben
  return null;
};

export const taskFormReducer = (state: TaskFormState, action: TaskFormAction): TaskFormState => {
  switch (action.type) {
    case 'SET_FIELD': {
      return { ...state, [action.field]: action.value };
    }

    case 'RESET_FORM': {
      return {
        ...initialFormState,
        qualityControlId: null,
        ui: {
          ...initialFormState.ui,
        },
        data: {
          ...state.data,
          selectedUser: null,
          selectedBranch: null
        }
      };
    }

    case 'LOAD_TASK': {
      if (!action.task || !action.task.id) {
        return {
          ...state,
          error: 'Ungültige Task-Daten empfangen'
        };
      }

      // Extrahiere die Daten aus der Task
      const {
        id,
        title,
        description,
        status,
        dueDate,
        responsible,
        branch,
        responsibleId,
        branchId,
        qualityControl,
        qualityControlId,
      } = action.task;

      // Verarbeite Verantwortlicher-Information
      let selectedUser = null;
      let responsibleIdToUse = null;

      if (responsible && typeof responsible === 'object' && responsible.id) {
        selectedUser = responsible;
        responsibleIdToUse = responsible.id;
      } else if (responsibleId) {
        responsibleIdToUse = responsibleId;
        selectedUser = state.data.users.find(u => u.id === responsibleId) || null;
      }

      // Verarbeite Branch-Information
      let selectedBranch = null;
      let branchIdToUse = null;

      if (branch && typeof branch === 'object' && branch.id) {
        selectedBranch = branch;
        branchIdToUse = branch.id;
      } else if (branchId) {
        branchIdToUse = branchId;
        selectedBranch = state.data.branches.find(b => b.id === branchId) || null;
      }

      // Verarbeite QC-Information
      let qcIdToUse = null;
      if (qualityControl && typeof qualityControl === 'object' && qualityControl.id) {
        qcIdToUse = qualityControl.id;
      } else if (qualityControlId) {
        qcIdToUse = qualityControlId;
      }

      // Stelle sicher, dass der Status einen Wert hat (Fallback zu 'open')
      const taskStatus = status || 'open';

      // Konvertiere das Datum in ein Date-Objekt, falls es ein String ist
      let formattedDueDate = null;
      if (dueDate) {
        try {
          formattedDueDate = dueDate instanceof Date ? dueDate : new Date(dueDate);
        } catch (error) {
        }
      }

      return {
        ...state,
        title: title || '',
        description: description || '',
        status: taskStatus as TaskStatus,
        dueDate: formattedDueDate,
        responsibleId: responsibleIdToUse,
        branchId: branchIdToUse,
        qualityControlId: qcIdToUse,
        data: {
          ...state.data,
          selectedUser,
          selectedBranch
        },
        error: null,
        formError: null
      };
    }

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
    
    case 'SET_USERS': {
      let selectedUser = state.data.selectedUser;
      if (state.responsibleId && !selectedUser) {
        selectedUser = action.users.find(u => u.id === state.responsibleId) || null;
      }
      
      return {
        ...state,
        data: {
          ...state.data,
          users: action.users,
          selectedUser: selectedUser
        }
      };
    }

    case 'SET_BRANCHES': {
      let selectedBranch = state.data.selectedBranch;
      if (state.branchId && !selectedBranch) {
        selectedBranch = action.branches.find(b => b.id === state.branchId) || null;
      }

      return {
        ...state,
        data: {
          ...state.data,
          branches: action.branches,
          selectedBranch: selectedBranch
        }
      };
    }

    case 'SET_SELECTED_USER': {
      const userId = action.user?.id || null;
      return {
        ...state,
        responsibleId: userId,
        data: {
          ...state.data,
          selectedUser: action.user
        }
      };
    }

    case 'SET_SELECTED_BRANCH': {
      const branchId = action.branch?.id || null;
      return {
        ...state,
        branchId: branchId,
        data: {
          ...state.data,
          selectedBranch: action.branch
        }
      };
    }

    case 'VALIDATE_FORM': {
      const formError = validateForm(state);
      return {
        ...state,
        formError
      };
    }

    default:
      return state;
  }
}; 