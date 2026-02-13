import { Tooltip } from '@mui/material';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { URGENCY_PRIORITY } from '../utils/consts';

export const UrgencyChangeIndicator = ({ prevUrgency, currentUrgency, iconSize = 40 }) => {
  if (!prevUrgency || !currentUrgency || prevUrgency === currentUrgency) {
    return null;
  }

  const increased = URGENCY_PRIORITY[currentUrgency] < URGENCY_PRIORITY[prevUrgency];

  return (
    <Tooltip 
      placement="right"
      title={`Urgency updated from ${prevUrgency.toUpperCase()} to ${currentUrgency.toUpperCase()}`}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center'}}>
        {increased ? (
          <ArrowDropUpIcon 
            sx={{ 
              color: 'error.main',
              fontSize: iconSize,
            }} 
          />
        ) : (
          <ArrowDropDownIcon 
            sx={{ 
              color: 'success.main',
              fontSize: iconSize,
            }} 
          />
        )}
      </span>
    </Tooltip>
  );
};