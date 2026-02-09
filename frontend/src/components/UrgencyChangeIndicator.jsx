import { Tooltip } from '@mui/material';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { URGENCY_PRIORITY } from '../utils/consts';

export const UrgencyChangeIndicator = ({ initialUrgency, currentUrgency, overrideBy = "", iconSize = 40 }) => {
  if (!initialUrgency || !currentUrgency || initialUrgency === currentUrgency) {
    return null;
  }

  const increased = URGENCY_PRIORITY[currentUrgency] < URGENCY_PRIORITY[initialUrgency];
  const overrideByDisplay = overrideBy ? ` by ${overrideBy}` : '';

  return (
    <Tooltip 
      placement="right"
      title={`Urgency updated from ${initialUrgency.toUpperCase()} to ${currentUrgency.toUpperCase()}${overrideByDisplay}`}
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