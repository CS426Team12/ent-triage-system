import uuid
import logging
from typing import Any, List, Type
from sqlmodel import Session, SQLModel

logger = logging.getLogger(__name__)

def log_changes(
    session: Session,
    old_record: SQLModel,
    new_values: dict[str, Any],
    changelog_model: Type[SQLModel],
    foreign_key_field: str,
    record_id: uuid.UUID,
    user_id: uuid.UUID,
    exclude_fields: List[str] = None
) -> int:
    try:
        if exclude_fields is None:
            exclude_fields = ['id', 'createdAt', 'updatedAt']
        
        changelog_entries = []
        old_dict = old_record.model_dump()
        
        for field_name, new_value in new_values.items():
            if field_name in exclude_fields:
                continue
                
            old_value = old_dict.get(field_name)
            
            if old_value == new_value:
                continue
                
            if old_value is None and new_value is None:
                continue
            
            changelog_data = {
                foreign_key_field: record_id,
                'changedBy': user_id,
                'fieldName': field_name,
                'oldValue': str(old_value) if old_value is not None else None,
                'newValue': str(new_value) if new_value is not None else None
            }
            
            changelog_entry = changelog_model(**changelog_data)
            changelog_entries.append(changelog_entry)
        
        for entry in changelog_entries:
            session.add(entry)
        
        return len(changelog_entries)
        
    except Exception as e:
        logger.error(f"Error logging changes: {str(e)}")
        return 0