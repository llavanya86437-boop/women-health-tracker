from pydantic import BaseModel, EmailStr
from typing import Optional

# Base schema with shared attributes
class UserBase(BaseModel):
    name: str
    email: EmailStr

# Schema for creating a user
class UserCreate(UserBase):
    pass

# Schema for partially updating a user
class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None

# Schema for returning a user back to the client
class UserResponse(UserBase):
    id: int

    # Config subclass to tell Pydantic to read data even if it is an ORM model
    class Config:
        from_attributes = True
