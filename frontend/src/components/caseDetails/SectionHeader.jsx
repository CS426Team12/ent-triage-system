import { Box, Typography } from "@mui/material";

export const SectionHeader = ({ children, sx }) => (
  <Box sx={{ borderLeft: 3, borderColor: "primary.main", pl: 1.5, mb: 2, ...sx }}>
    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
      {children}
    </Typography>
  </Box>
);