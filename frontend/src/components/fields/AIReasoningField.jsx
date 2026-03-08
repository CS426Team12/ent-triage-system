// Component for AI Reasoning Accordion

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
  Box,
  Chip,
  Stack,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { APP_COLORS } from "../../theme";
import { AI_REASONING_FLAG_LABELS } from "../../utils/consts";

export default function AIReasoningField({ flags }) {
  if (flags && Object.keys(flags).length > 0) {
    const groupFlags = Object.groupBy(flags, ({ tag }) => tag); //group flag by tag
    const orderedTags = Object.keys(AI_REASONING_FLAG_LABELS); //maintain consistent tag order

    return (
      <Accordion
        elevation={0}
        disableGutters
        sx={{
          boxShadow: "none",
          "&:before": {
            display: "none",
          },
        }}>
        <AccordionSummary
          sx={{ padding: 0 }}
          expandIcon={<ArrowDropDownIcon />}>
          <Box display="flex" alignItems="center">
            <InfoOutlinedIcon
              fontSize="small"
              sx={{ color: APP_COLORS.purple[400] }}
            />
            <Typography
              sx={{ pl: 1, lineHeight: 1 }}
              variant="caption"
              color="textSecondary">
              Learn More about AI Reasoning
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails sx={{ paddingTop: 0 }}>
          <Stack spacing={1}>
            {orderedTags.map((tag) => {
              const keywords = groupFlags[tag];
              if (!keywords) return null;

              return (
                <Box key={tag}>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 500, mb: 0.5 }}>
                    {AI_REASONING_FLAG_LABELS[tag]}
                  </Typography>
                  <Box display="flex" flexWrap="wrap" gap={0.5}>
                    {keywords.map((flag, i) => (
                      <Chip key={i} label={flag.keyword} size="small" />
                    ))}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </AccordionDetails>
      </Accordion>
    );
  } else {
  }
  return (
    <Accordion
      elevation={0}
      disableGutters
      sx={{
        boxShadow: "none",
        "&:before": {
          display: "none",
        },
      }}>
      <AccordionSummary sx={{ padding: 0 }} expandIcon={<ArrowDropDownIcon />}>
        <Box display="flex" alignItems="center">
          <InfoOutlinedIcon
            fontSize="small"
            sx={{ color: APP_COLORS.purple[400] }}
          />
          <Typography
            sx={{ pl: 1, lineHeight: 1 }}
            variant="caption"
            color="textSecondary">
            Learn More about AI Reasoning
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ paddingTop: 0 }}>
        <Typography variant="caption" color="textSecondary">
          No AI reasoning information available at this time.
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}
