import React from "react";
import { AgGridReact } from "ag-grid-react";
import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
} from "ag-grid-community";
import { Box, Typography } from "@mui/material";
import "./GridStyles.css";
import { TABLE_COLORS } from "../../theme";

ModuleRegistry.registerModules([AllCommunityModule]);

const NoRowsOverlay = (props) => (
  <Box sx={{ p: 4, textAlign: "center" }}>
    <Typography color="text.secondary">
      {props.message || "No records found"}
    </Typography>
  </Box>
);

const DataGrid = ({
  rowData,
  columnDefs,
  gridOptions = {},
  loading = false,
  quickFilterText = "",
  onRowClicked,
  noRowsMessage,
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
      pagination={true}
      paginationPageSize={10}
      paginationPageSizeSelector={[10, 25, 50]}
      onRowClicked={onRowClicked}
      rowStyle={onRowClicked ? { cursor: "pointer" } : undefined}
      noRowsOverlayComponent={NoRowsOverlay}
      noRowsOverlayComponentParams={{ message: noRowsMessage }}
      {...gridOptions}
    />
  );
};

export default DataGrid;
