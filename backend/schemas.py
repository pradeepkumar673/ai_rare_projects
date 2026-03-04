"""
Pydantic schemas for request validation.
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from werkzeug.datastructures import FileStorage
import re

class DiagnosisInput(BaseModel):
    symptoms: List[str] = Field(default_factory=list)
    age: Optional[int] = None
    gender: Optional[str] = None
    ethnicity: Optional[str] = None
    region: Optional[str] = None
    consent: bool = False
    image: Optional[FileStorage] = None

    @field_validator('age')
    def validate_age(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and (v < 0 or v > 130):
            raise ValueError('Age must be between 0 and 130')
        return v

    @field_validator('gender')
    def validate_gender(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ['male', 'female', 'other']:
            raise ValueError('Gender must be male/female/other')
        return v

    @field_validator('image')
    def validate_image(cls, v: Optional[FileStorage]) -> Optional[FileStorage]:
        if v:
            if v.content_type not in ['image/jpeg', 'image/png', 'image/jpg']:
                raise ValueError('Image must be JPEG or PNG')
            # Content length may not be set, we'll check during save
        return v