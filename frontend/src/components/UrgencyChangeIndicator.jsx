import { Tooltip } from '@mui/material';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import { URGENCY_PRIORITY } from '../utils/consts';

export const UrgencyChangeIndicator = ({ initialUrgency, currentUrgency }) => {
  if (!initialUrgency || !currentUrgency || initialUrgency === currentUrgency) {
    return null;
  }

  const increased = URGENCY_PRIORITY[currentUrgency] < URGENCY_PRIORITY[initialUrgency];

  return (
    <Tooltip 
      title={`Urgency updated from ${initialUrgency.toUpperCase()} to ${currentUrgency.toUpperCase()}`}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
        {increased ? (
          <ArrowDropUpIcon 
            sx={{ 
              color: 'error.main',
              fontSize: 40,
            }} 
          />
        ) : (
          <ArrowDropDownIcon 
            sx={{ 
              color: 'success.main',
              fontSize: 40,
            }} 
          />
        )}
      </span>
    </Tooltip>
  );
};