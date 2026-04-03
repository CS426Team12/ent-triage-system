import { useState } from "react";
import { Typography, Box } from "@mui/material";

import { CaseFileUpload } from "./CaseFileUpload";
import { CaseFileList } from "./CaseFileList";

export const CaseFiles = ({ caseId }) => {
  // Used to trigger refresh of file list after upload
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <Box>
      <Typography sx={{ fontWeight: 600 }} gutterBottom>
        Case Files
      </Typography>
      <Box margin={2}>
        <CaseFileList key={refreshKey} caseId={caseId} />
      </Box>
      <Box margin={2}>
        <CaseFileUpload
          caseId={caseId}
          onUploadComplete={() => setRefreshKey((prev) => prev + 1)}
        />
      </Box>
    </Box>
  );
};
