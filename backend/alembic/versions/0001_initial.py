"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


_VTYPES = (
    "helmet_violation",
    "signal_jump",
    "wrong_way",
    "speeding",
    "no_seatbelt",
    "illegal_parking",
)
_VSTATUS = (
    "detected",
    "confirmed",
    "rejected",
    "evidence_generated",
    "sent_to_authority",
)


def _enum_sql(name: str, values: tuple[str, ...]) -> str:
    quoted = ", ".join(f"'{v}'" for v in values)
    return f"CREATE TYPE {name} AS ENUM ({quoted})"


def upgrade() -> None:
    # Create the enum types explicitly first; column references below use
    # create_type=False so they don't try to create them again.
    op.execute(_enum_sql("violationtype", _VTYPES))
    op.execute(_enum_sql("violationstatus", _VSTATUS))

    op.create_table(
        "cameras",
        sa.Column("id", sa.String(100), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("stream_url", sa.Text(), nullable=False),
        sa.Column("location", sa.String(255)),
        sa.Column("status", sa.String(50), server_default="active"),
        sa.Column("lat", sa.Float()),
        sa.Column("lng", sa.Float()),
        sa.Column("stop_line_geom", postgresql.JSONB()),
        sa.Column("last_frame_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    op.create_table(
        "violations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("camera_id", sa.String(100), nullable=False, index=True),
        sa.Column(
            "violation_type",
            postgresql.ENUM(*_VTYPES, name="violationtype", create_type=False),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "status",
            postgresql.ENUM(*_VSTATUS, name="violationstatus", create_type=False),
            server_default="detected",
            index=True,
        ),
        sa.Column("license_plate", sa.String(20), index=True),
        sa.Column("confidence", sa.Float(), nullable=False),
        sa.Column("fine_amount", sa.Float(), server_default="0.0"),
        sa.Column("clip_url", sa.Text()),
        sa.Column("thumbnail_url", sa.Text()),
        sa.Column("evidence_package_url", sa.Text()),
        sa.Column("location", sa.String(255)),
        sa.Column("detected_at", sa.DateTime(), server_default=sa.func.now(), index=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now()),
        sa.Column("metadata_json", sa.Text()),
    )


def downgrade() -> None:
    op.drop_table("violations")
    op.drop_table("cameras")
    op.execute("DROP TYPE IF EXISTS violationstatus")
    op.execute("DROP TYPE IF EXISTS violationtype")
