import { concatNameValueGetter } from '../gridUtils';
import { roleLabel } from '../consts';

export const userColumnDefs = () => [
  {
    headerName: 'Name',
    colId: 'name',
    flex: 0.75,
    minWidth: 150,
    filter: 'agTextColumnFilter',
    valueGetter: (params) => {
      return concatNameValueGetter(params.data.firstName, params.data.lastName);
    },
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
    headerName: 'Admin',
    field: 'isAdmin',
    flex: 0.25,
    minWidth: 100,
    sortable: true,
    cellRenderer: 'agCheckboxCellRenderer',
    cellRendererParams: { disabled: true },
  },
];