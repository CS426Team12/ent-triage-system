import {
  UrgencyCellRenderer,
  urgencyComparator,
  dateTimeFormatter,
  EditCaseButtonCellRenderer,
  concatNameValueGetter,
} from '../gridUtils';

export const reviewedColDefs = [
  {
    headerName: 'Urgency',
    flex: 1, // flex determines the proportion the column will take up
    minWidth: 150, // set minimum width to create overflow on smaller window sizes
    cellRenderer: UrgencyCellRenderer,
    filter: 'agTextColumnFilter',
    comparator: urgencyComparator,
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
    }
  },
  {
    headerName: 'Review Reason',
    flex: 6,
    minWidth: 300,
    tooltipValueGetter: (params) => {
      return params.data.reviewReason;
    },
    filter: 'agTextColumnFilter',
    field: "reviewReason",
  },
  {
    headerName: 'Reviewed By',
    field: 'reviewedByEmail',
    flex: 0.75,
    minWidth: 200,
    filter: 'agTextColumnFilter',
  },
    {
    headerName: 'Reviewed At',
    field: 'reviewTimestamp',
    flex: 0.75,
    minWidth: 200,
    sort: "desc",
    valueFormatter: dateTimeFormatter,
    filter: 'agDateColumnFilter',
  },
  {
    headerName: 'Edit',
    flex: 0.5,
    minWidth: 100,
    cellRenderer: EditCaseButtonCellRenderer,
    sortable: false,
  },
];