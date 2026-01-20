import React, { useState } from "react";
import DataGrid from "./DataGrid";
import { TextField, InputAdornment } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
const SearchableDataGrid = ({
  rowData,
  columnDefs,
  gridOptions = {},
  loading,
}) => {
  const [search, setSearch] = useState("");

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <TextField
        placeholder="Search"
        value={search}
        onChange={handleSearchChange}
        variant="outlined"
        size="small"
        fullWidth
        sx={{
          marginBottom: 1,
        }}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
      />
      <DataGrid
        rowData={rowData}
        columnDefs={columnDefs}
        gridOptions={gridOptions}
        loading={loading}
        quickFilterText={search}
      />
    </div>
  );
};

export default SearchableDataGrid;
