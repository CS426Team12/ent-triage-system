import {
  UrgencyCellRenderer,
  urgencyComparator,
  dateTimeFormatter,
  EditCaseButtonCellRenderer,
  concatNameValueGetter,
  UrgencyChangeCellRenderer,
} from '../gridUtils';

export const unreviewedColDefs = [
  {
    headerName: 'Change',
    colId: "change",
    filter: false,
    sortable: false,
    cellRenderer: UrgencyChangeCellRenderer,
    flex: 0.25,
    minWidth: 100,
  },
  {
    headerName: 'Urgency',
    flex: 1, // flex determines the proportion the column will take up
    minWidth: 150, // set minimum width to create overflow on smaller window sizes
    cellRenderer: UrgencyCellRenderer,
    filter: 'agTextColumnFilter',
    comparator: urgencyComparator,
    sort: "asc",
    valueGetter: (params) => {
      return params.data.overrideUrgency || params.data.AIUrgency;
    }
  },
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
    headerName: 'Date Created',
    field: 'dateCreated',
    flex: 0.75,
    minWidth: 200,
    valueFormatter: dateTimeFormatter,
    filter: 'agDateColumnFilter',
  },
  {
    headerName: 'Summary',
    flex: 6,
    minWidth: 300,
    tooltipValueGetter: (params) => {
      return params.data.overrideSummary || params.data.AISummary;
    },
    filter: 'agTextColumnFilter',
    valueGetter: (params) => {
      return params.data.overrideSummary || params.data.AISummary;
    },
  },
  {
    headerName: 'Edit',
    flex: 0.5,
    minWidth: 100,
    cellRenderer: EditCaseButtonCellRenderer,
    sortable: false,
  },
];