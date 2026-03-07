import {
  EditUserButtonCellRenderer,
  concatNameValueGetter,
} from '../gridUtils';
import { roleLabel } from '../consts';

// callback so callers can pass refresh handlers (fetchUsers)
export const userColumnDefs = (onUserUpdated) => [
  {
    headerName: 'Name',
    colId: 'name',
    flex: 0.75,
    minWidth: 150,
    filter: 'agTextColumnFilter',
    valueGetter: (params) => {
      return concatNameValueGetter(params.data.firstName, params.data.lastName);
    }
  },
  {
    headerName: 'Email',
    field: 'email',
    flex: 0.5,
    minWidth: 100,
    filter: 'agTextColumnFilter',
  },
  {
    headerName: 'Role',
    field: 'role',
    flex: 0.5,
    minWidth: 150,
    filter: 'agTextColumnFilter',
    valueFormatter: (params) => roleLabel(params.value),
  },
  {
    headerName: 'Edit',
    flex: 0.25,
    minWidth: 100,
    cellRenderer: EditUserButtonCellRenderer,
    cellRendererParams: { onUserUpdated },
    sortable: false,
  },
];