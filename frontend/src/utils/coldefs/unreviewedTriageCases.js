import {
  UrgencyCellRenderer,
  SummaryCellRenderer,
  urgencyComparator,
  relativeDateFormatter,
  concatNameValueGetter,
} from '../gridUtils';

export const unreviewedColDefs = () => [
  {
    headerName: 'Urgency',
    flex: 1,
    minWidth: 150,
    cellRenderer: UrgencyCellRenderer,
    filter: 'agTextColumnFilter',
    comparator: urgencyComparator,
    sort: "asc",
    valueGetter: (params) => {
      return params.data.overrideUrgency || params.data.AIUrgency;
    },
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
    flex: 0.6,
    minWidth: 140,
    valueFormatter: relativeDateFormatter,
    filter: 'agDateColumnFilter',
  },
  {
    headerName: 'Summary',
    flex: 6,
    minWidth: 300,
    cellRenderer: SummaryCellRenderer,
    tooltipValueGetter: (params) => {
      return params.data.overrideSummary || params.data.AISummary;
    },
    filter: 'agTextColumnFilter',
    valueGetter: (params) => {
      return params.data.overrideSummary || params.data.AISummary;
    },
  },
];
