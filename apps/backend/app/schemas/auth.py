from pydantic import BaseModel, EmailStr


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    redirectTo: str | None = None


class MagicLinkRequest(BaseModel):
    email: EmailStr
    redirectTo: str | None = None


class SimpleOkResponse(BaseModel):
    ok: bool = True


class PasswordResetRequest(BaseModel):
    email: EmailStr
    redirectTo: str | None = None


