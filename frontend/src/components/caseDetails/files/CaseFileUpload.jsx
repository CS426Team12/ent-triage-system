import { useDropzone } from "react-dropzone";
import { useState } from "react";
import { triageCaseService } from "../../../api/triageCaseService";
import { Paper, Typography, LinearProgress, Box } from "@mui/material";
import axios from "axios";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { toast } from "../../../utils/toast";

export const CaseFileUpload = ({ caseId, onUploadComplete }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      setUploading(true);
      // Get presigned URL and file key from backend
      const { presigned_url, file_key } = await triageCaseService.getUploadUrl(
        caseId,
        file.name,
      );

      // Upload file directly to S3 using the presigned URL
      await axios.put(presigned_url, file, {
        headers: { "Content-Type": file.type },
        onUploadProgress: (event) => {
          if (event.total) {
            setProgress(Math.round((event.loaded * 100) / event.total));
          }
        },
      });

      // Notify backend of new file so it can be associated with the case
      await triageCaseService.addCaseFile(caseId, {
        fileName: file.name,
        fileKey: file_key,
        fileType: file.type,
      });

      setProgress(0);
      // Trigger parent to refresh file list
      if (onUploadComplete) onUploadComplete();
    } catch (err) {
      toast.error("Failed to upload file, please try again.");
      console.error("Upload failed", err);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  });

  return (
    <Paper
      {...getRootProps()}
      sx={{
        p: 3,
        border: "2px dashed",
        borderColor: isDragActive ? "primary.main" : "grey.400",
        textAlign: "center",
        cursor: "pointer",
        backgroundColor: isDragActive ? "action.hover" : "transparent",
      }}>
      <input {...getInputProps()} />
      <FileUploadIcon sx={{ mb: 1, fontSize: 50 }} color="primary" />
      <Typography variant="subtitle1">
        {isDragActive ? "Drop file here" : "Drag & drop or click to upload"}
      </Typography>

      {uploading && (
        <Box mt={2}>
          <LinearProgress variant="determinate" value={progress} />
          <Typography variant="caption">{progress}%</Typography>
        </Box>
      )}
    </Paper>
  );
};
