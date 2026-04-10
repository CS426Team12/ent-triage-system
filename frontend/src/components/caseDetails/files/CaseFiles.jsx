import { useState } from "react";
import { Box, Stack } from "@mui/material";
import { SectionHeader } from "../SectionHeader";
import { CaseFileUpload } from "./CaseFileUpload";
import { CaseFileList } from "./CaseFileList";

export const CaseFiles = ({ caseId }) => {
  // Used to trigger refresh of file list after upload
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <Box>
      <SectionHeader>Case Files</SectionHeader>
      <Stack spacing={2}>
        <CaseFileList key={refreshKey} caseId={caseId} />
        <CaseFileUpload
          caseId={caseId}
          onUploadComplete={() => setRefreshKey((prev) => prev + 1)}
        />
      </Stack>
    </Box>
  );
};
