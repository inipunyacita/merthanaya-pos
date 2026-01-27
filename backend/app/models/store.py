from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class StoreBase(BaseModel):
    name: str
    logo_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    receipt_footer: Optional[str] = None

class StoreCreate(StoreBase):
    pass

class StoreUpdate(BaseModel):
    name: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    receipt_footer: Optional[str] = None

class Store(StoreBase):
    id: UUID
    owner_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StoreResponse(Store):
    pass
