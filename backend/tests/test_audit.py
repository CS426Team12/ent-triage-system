import hashlib
import json
from app.core.audit import AuditService


def test_compute_hash_matches_manual():
    log_id = "log-1"
    actor_id = "actor-1"
    actor_type = "USER"
    resource_type = "PATIENT"
    resource_id = "res-1"
    action = "UPDATE"
    status = "SUCCESS"
    timestamp = "2024-01-01T00:00:00Z"
    previous_hash = "prevhash"

    computed = AuditService.compute_hash(
        log_id=log_id,
        actor_id=actor_id,
        actor_type=actor_type,
        resource_type=resource_type,
        resource_id=resource_id,
        action=action,
        status=status,
        timestamp=timestamp,
        previous_hash=previous_hash,
    )

    manual_input = {
        "logID": log_id,
        "actorID": actor_id,
        "actorType": actor_type,
        "resourceType": resource_type,
        "resourceID": resource_id,
        "action": action,
        "status": status,
        "timestamp": timestamp,
        "previousHash": previous_hash,
    }
    expected = hashlib.sha256(json.dumps(manual_input, sort_keys=True).encode()).hexdigest()
    assert computed == expected
