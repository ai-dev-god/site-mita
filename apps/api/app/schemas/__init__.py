"""Pydantic v2 OpenAPI 3.1 schemas for the LMBSC Hospitality Platform."""

from app.schemas.campaign import CampaignLogCreate, CampaignLogRead, CampaignLogUpdate
from app.schemas.event import EventCreate, EventRead, EventUpdate, TicketCreate, TicketRead
from app.schemas.guest import GuestProfileCreate, GuestProfileRead, GuestProfileUpdate
from app.schemas.reservation import ReservationCreate, ReservationRead, ReservationUpdate
from app.schemas.shift import ShiftAssignmentCreate, ShiftCreate, ShiftRead
from app.schemas.staff import StaffMemberCreate, StaffMemberRead, StaffMemberUpdate
from app.schemas.table import TableCreate, TableRead, TableStatusUpdate
from app.schemas.venue import VenueCreate, VenueRead
from app.schemas.waitlist import WaitlistEntryCreate, WaitlistEntryRead, WaitlistEntryUpdate
from app.schemas.zone import ZoneCreate, ZoneRead

__all__ = [
    "VenueCreate", "VenueRead",
    "ZoneCreate", "ZoneRead",
    "TableCreate", "TableRead", "TableStatusUpdate",
    "ReservationCreate", "ReservationRead", "ReservationUpdate",
    "GuestProfileCreate", "GuestProfileRead", "GuestProfileUpdate",
    "ShiftCreate", "ShiftRead", "ShiftAssignmentCreate",
    "StaffMemberCreate", "StaffMemberRead", "StaffMemberUpdate",
    "WaitlistEntryCreate", "WaitlistEntryRead", "WaitlistEntryUpdate",
    "EventCreate", "EventRead", "EventUpdate",
    "TicketCreate", "TicketRead",
    "CampaignLogCreate", "CampaignLogRead", "CampaignLogUpdate",
]
