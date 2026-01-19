import React from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
} from "ag-grid-community";
import "./GridStyles.css";
import { TABLE_COLORS } from "../../theme";

ModuleRegistry.registerModules([AllCommunityModule]);

const DataGrid = ({
  rowData,
  columnDefs,
  gridOptions = {},
  loading = false,
  quickFilterText = "",
}) => {
  const theme = themeQuartz.withParams({
    headerBackgroundColor: TABLE_COLORS.headerBackground,
    backgroundColor: TABLE_COLORS.background,
    rowHoverColor: TABLE_COLORS.rowHover,
    border: false,
  });

  return (
    <AgGridReact
      theme={theme}
      rowData={rowData}
      columnDefs={columnDefs}
      tooltipShowDelay={0}
      enableCellTextSelection={true}
      loading={loading}
      quickFilterText={quickFilterText}
      {...gridOptions}
    />
  );
};

export default DataGrid;
