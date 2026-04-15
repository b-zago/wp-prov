import re

from pydantic import BaseModel, field_validator

_RELEASE_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,52}[a-z0-9]$")
# Single DNS label: 1-63 chars, lowercase alphanumeric + hyphens, no leading or
# trailing hyphen, and — crucially — no dots (enforces one level of subdomain).
_SUBDOMAIN_RE = re.compile(r"^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$")
_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class DeployRequest(BaseModel):
    releaseName: str
    subdomain: str
    title: str
    wpMail: str
    dbUser: str
    dbPassword: str
    dbRootPassword: str
    wpUser: str
    wpPassword: str
    sftpUser: str
    sftpPassword: str

    @field_validator("releaseName")
    @classmethod
    def _validate_release_name(cls, v: str) -> str:
        if not _RELEASE_RE.match(v):
            raise ValueError(
                "releaseName must be lowercase alphanumeric and hyphens only, 2-54 chars"
            )
        return v

    @field_validator("subdomain")
    @classmethod
    def _validate_subdomain(cls, v: str) -> str:
        if not _SUBDOMAIN_RE.match(v):
            raise ValueError(
                "subdomain must be a single DNS label: lowercase alphanumeric "
                "and hyphens only, 1-63 chars, no leading/trailing hyphen, no dots"
            )
        return v

    @field_validator("wpMail")
    @classmethod
    def _validate_email(cls, v: str) -> str:
        if not _EMAIL_RE.match(v):
            raise ValueError("wpMail must be a valid email address")
        return v

    @field_validator(
        "title",
        "dbUser",
        "dbPassword",
        "dbRootPassword",
        "wpUser",
        "wpPassword",
        "sftpUser",
        "sftpPassword",
    )
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("must not be blank")
        return v
