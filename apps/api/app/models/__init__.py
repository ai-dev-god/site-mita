"""SQLAlchemy ORM models for the LMBSC Hospitality Platform."""

from app.models.base import AuditMixin, Base
from app.models.campaign import CampaignChannel, CampaignLog, CampaignStatus, CampaignType
from app.models.event import Event, EventStatus, Ticket, TicketStatus
from app.models.guest import GuestProfile
from app.models.metrics import TableTurnMetric
from app.models.reservation import Reservation, ReservationStatus, SpecialOccasion
from app.models.shift import Shift, ShiftAssignment, ShiftType
from app.models.staff import ShiftAssignment, StaffMember, StaffRole
from app.models.table import Table, TableShape, TableStatus
from app.models.venue import Venue
from app.models.waitlist import WaitlistEntry, WaitlistStatus
from app.models.zone import ReservationPolicy, Zone, ZoneType

__all__ = [
    # Base
    "Base",
    "AuditMixin",
    # Venue / Zone / Table
    "Venue",
    "Zone",
    "ZoneType",
    "ReservationPolicy",
    "Table",
    "TableShape",
    "TableStatus",
    # Reservation
    "Reservation",
    "ReservationStatus",
    "SpecialOccasion",
    # Guest
    "GuestProfile",
    # Staff / Shift
    "StaffMember",
    "StaffRole",
    "Shift",
    "ShiftType",
    "ShiftAssignment",
    # Waitlist
    "WaitlistEntry",
    "WaitlistStatus",
    # Event / Ticket
    "Event",
    "EventStatus",
    "Ticket",
    "TicketStatus",
    # Campaign
    "CampaignLog",
    "CampaignType",
    "CampaignChannel",
    "CampaignStatus",
    # Metrics
    "TableTurnMetric",
]
