import {
  Typography,
  Box,
  IconButton,
  Tooltip,
  Collapse,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
} from "@mui/material";
import ThumbUp from "@mui/icons-material/ThumbUp";
import ThumbDown from "@mui/icons-material/ThumbDown";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import ThumbDownOffAltIcon from "@mui/icons-material/ThumbDownOffAlt";
import { APP_COLORS } from "../../../theme";
import { FEEDBACK_TAGS, FEEDBACK_TAG_LABELS } from "../../../utils/consts";

import { useState, useEffect } from "react";

export default function FeedbackWidget({ initialFeedback, onFeedbackChange }) {
  const [rating, setRating] = useState(null);
  const [tags, setTags] = useState([]);
  const [comment, setComment] = useState("");

  const isOtherSelected = tags.includes(FEEDBACK_TAGS.OTHER);

  // Load existing feedback on mount or when initialFeedback changes
  useEffect(() => {
    if (initialFeedback) {
      setRating(initialFeedback.rating || null);
      setTags(initialFeedback.tags || []);
      setComment(initialFeedback.comment || "");
    } else {
      setRating(null);
      setTags([]);
      setComment("");
    }
  }, [initialFeedback]);

  
  const handleTagsChange = (e, newTags) => {
    if (!newTags.includes(FEEDBACK_TAGS.OTHER)) {
      setComment("");
    }
    setTags(newTags);
    notifyChange(rating, newTags, comment);
  };

  const handleRatingChange = (newRating) => {
    const updatedRating = rating === newRating ? null : newRating;
    setRating(updatedRating);
    notifyChange(updatedRating, tags, comment);
  };

  const handleCommentChange = (e) => {
    const newComment = e.target.value;
    setComment(newComment);
    notifyChange(rating, tags, newComment);
  };

  const notifyChange = (currentRating, currentTags, currentComment) => {
    if (onFeedbackChange) {
      onFeedbackChange({
        rating: currentRating,
        tags: currentTags,
        comment: currentComment,
      });
    }
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="caption">Was this AI summary helpful?</Typography>
        <Tooltip title="Helpful">
          <IconButton onClick={() => handleRatingChange("up")}>
            {rating === "up" ? (
              <ThumbUp
                fontSize="small"
                sx={{ color: APP_COLORS.purple[400] }}
              />
            ) : (
              <ThumbUpOffAltIcon
                fontSize="small"
                sx={{ color: APP_COLORS.purple[400] }}
              />
            )}
          </IconButton>
        </Tooltip>
        <Tooltip title="Not helpful">
          <IconButton onClick={() => handleRatingChange("down")}>
            {rating === "down" ? (
              <ThumbDown
                fontSize="small"
                sx={{ color: APP_COLORS.purple[400] }}
              />
            ) : (
              <ThumbDownOffAltIcon
                fontSize="small"
                sx={{ color: APP_COLORS.purple[400] }}
              />
            )}
          </IconButton>
        </Tooltip>
      </Box>
      <Box>
        <Collapse in={rating === "down"}>
          <Typography variant="caption" color="textSecondary">
            What was wrong? (optional)
          </Typography>
          <Box>
            <ToggleButtonGroup
              size="small"
              color="primary"
              value={tags}
              onChange={handleTagsChange}
              sx={{
                flexWrap: "wrap",
                gap: 1,
                "& .MuiToggleButton-root": {
                  //match chip styling
                  textTransform: "none",
                  border: "1px solid",
                  borderColor: APP_COLORS.border.light,
                  borderRadius: 2,
                  fontSize: "0.7rem",
                  px: 1,
                  py: 0.25,
                  minHeight: "24px",
                },
              }}>
              {Object.values(FEEDBACK_TAGS).map((tag) => (
                <ToggleButton
                  key={tag}
                  value={tag}
                  sx={{
                    textTransform: "none",
                    borderRadius: 0,
                    padding: "2px",
                  }}>
                  {FEEDBACK_TAG_LABELS[tag]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            {isOtherSelected && (
              <Box mt={1}>
                <TextField
                  variant="standard"
                  hiddenLabel
                  fullWidth
                  size="small"
                  rows={1}
                  placeholder="Please specify..."
                  value={comment}
                  onChange={handleCommentChange}
                  InputProps={{
                    sx: {
                      fontSize: "0.75rem", //Match caption
                      padding: "0px 8px",
                    },
                  }}
                />
              </Box>
            )}
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
