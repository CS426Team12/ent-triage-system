import { useEffect, useState } from "react";
import { triageCaseService } from "../../../api/triageCaseService";

import {
  List,
  ListItem,
  ListItemText,
  IconButton,
  Typography,
  Paper,
  Dialog,
  DialogContent,
} from "@mui/material";

import DeleteIcon from "@mui/icons-material/Delete";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

export const CaseFileList = ({ caseId }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Fetch files for the case
  const fetchFiles = async () => {
    setLoading(true);
    try {
      const data = await triageCaseService.getCaseFiles(caseId);
      const refreshed = Array.isArray(data.files) ? data.files : [];
      setFiles(refreshed);
    } catch (err) {
      console.error("Failed to fetch files", err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // Load files on mount
  useEffect(() => {
    fetchFiles();
  }, [caseId]);

  // Get a valid URL for the file, refreshing if expired
  const getValidUrl = async (file) => {
    if (new Date(file.urlExpiresAt) > new Date()) {
      return file.url;
    }

    await fetchFiles();
    const updated = files.find((f) => f.id === file.id);
    return updated?.url;
  };

  // Delete a file and refresh the list
  const deleteFile = async (fileId) => {
    await triageCaseService.deleteCaseFile(caseId, fileId);
    await fetchFiles();
  };

  // Open file in new tab or show image dialog
  const openFile = async (file) => {
    const url = await getValidUrl(file);
    if (!url) return;

    if (file.fileType?.startsWith("image/")) {
      setSelectedImage({ url, name: file.fileName });
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <Paper elevation={3} sx={{ maxHeight: 240, overflow: "auto" }}>
      {loading ? (
        <Typography sx={{ p: 2 }}>Loading...</Typography>
      ) : files.length === 0 ? (
        <Typography sx={{ p: 2 }} color="text.secondary">
          No files uploaded
        </Typography>
      ) : (
        <List disablePadding>
          {files.map((file) => (
            <ListItem
              divider
              sx={{ display: "flex", alignItems: "center", height: 60, pr: 12 }}
              key={file.id}
              secondaryAction={
                <>
                  {file.fileType?.startsWith("image/") ? (
                    <IconButton
                      onClick={() => openFile(file)}
                      sx={{ mr: 2, p: 0 }}>
                      <img
                        src={file.url}
                        alt={file.fileName}
                        style={{
                          maxWidth: 50,
                          maxHeight: 50,
                          objectFit: "cover",
                          borderRadius: 4,
                        }}
                      />
                    </IconButton>
                  ) : (
                    <IconButton onClick={() => openFile(file)} sx={{ mr: 1 }}>
                      <OpenInNewIcon />
                    </IconButton>
                  )}

                  <IconButton onClick={() => deleteFile(file.id)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </>
              }>
              <ListItemText primary={file.fileName} />
            </ListItem>
          ))}
        </List>
      )}
      <Dialog
        open={!!selectedImage}
        onClose={() => setSelectedImage(null)}
        maxWidth="lg">
        <DialogContent sx={{ p: 0, backgroundColor: "black" }}>
          {selectedImage && (
            <img
              src={selectedImage.url}
              alt={selectedImage.name}
              style={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "80vh",
                margin: "auto",
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </Paper>
  );
};
