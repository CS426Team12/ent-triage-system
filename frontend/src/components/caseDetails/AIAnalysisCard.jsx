import { useState } from "react";
import { Box, Typography, Chip, Stack, Collapse, IconButton } from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { red, grey } from "@mui/material/colors";
import { APP_COLORS } from "../../theme";
import { AI_REASONING_FLAG_LABELS } from "../../utils/consts";
import FeedbackWidget from "./feedback/FeedbackWidget";

const redFlagChipSx = {
  bgcolor: red[50],
  border: `1px solid ${red[200]}`,
  color: red[800],
  fontWeight: 500,
  fontSize: "0.7rem",
  height: 22,
};

const defaultChipSx = {
  bgcolor: grey[100],
  border: `1px solid ${grey[300]}`,
  color: "text.primary",
  fontWeight: 500,
  fontSize: "0.7rem",
  height: 22,
};

function FlagsDisplay({ flags }) {
  if (!flags?.length) return null;

  const grouped = Object.groupBy(flags, ({ tag }) => tag);
  const orderedTags = Object.keys(AI_REASONING_FLAG_LABELS);

  return (
    <Stack spacing={1.5}>
      {orderedTags.map((tag) => {
        const keywords = grouped[tag];
        if (!keywords?.length) return null;
        return (
          <Box key={tag}>
            <Typography
              variant="caption"
              sx={{ fontWeight: 600, color: "text.secondary", display: "block", mb: 0.5 }}
            >
              {AI_REASONING_FLAG_LABELS[tag]}
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5}>
              {keywords.map((flag, i) => (
                <Chip
                  key={i}
                  label={flag.keyword}
                  size="small"
                  sx={tag === "RED_FLAG" ? redFlagChipSx : defaultChipSx}
                />
              ))}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}

export default function AIAnalysisCard({ caseData, feedback, onFeedbackChange }) {
  const [expanded, setExpanded] = useState(true);
  const hasFlags = caseData.flags?.length > 0;

  return (
    <Box
      sx={{
        borderLeft: `2px solid ${APP_COLORS.purple[200]}`,
        pl: 1.5,
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        gap={0.75}
        sx={{ cursor: "pointer", userSelect: "none" }}
        onClick={() => setExpanded((v) => !v)}
      >
        <AutoAwesomeIcon sx={{ color: APP_COLORS.purple[400], fontSize: 15 }} />
        <Typography variant="subtitle2" fontWeight={600} color="text.secondary" sx={{ flex: 1 }}>
          AI Analysis
        </Typography>
        <IconButton size="small" tabIndex={-1} sx={{ p: 0 }}>
          <ExpandMoreIcon
            sx={{
              fontSize: 18,
              color: "text.secondary",
              transition: "transform 0.2s",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Box display="flex" flexDirection="column" gap={2} pt={2}>
          <Box>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              AI Summary
            </Typography>
            <Typography variant="body2">
              {caseData.AISummary || "No summary available."}
            </Typography>
          </Box>
          {hasFlags && (
            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Key Findings
              </Typography>
              <FlagsDisplay flags={caseData.flags} />
            </Box>
          )}
          <FeedbackWidget
            initialFeedback={feedback}
            onFeedbackChange={onFeedbackChange}
          />
        </Box>
      </Collapse>
    </Box>
  );
}
