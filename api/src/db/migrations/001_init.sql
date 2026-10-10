-- StayDesk initial schema

-- Needed for the exclusion constraint that blocks overlapping bookings.
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE rooms (
  id            SERIAL PRIMARY KEY,
  number        VARCHAR(10)   NOT NULL UNIQUE,
  type          VARCHAR(20)   NOT NULL CHECK (type IN ('single', 'double', 'suite')),
  capacity      INTEGER       NOT NULL CHECK (capacity > 0),
  nightly_rate  NUMERIC(10,2) NOT NULL CHECK (nightly_rate >= 0),
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE guests (
  id          SERIAL PRIMARY KEY,
  full_name   VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL UNIQUE,
  phone       VARCHAR(30),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE reservations (
  id            SERIAL PRIMARY KEY,
  room_id       INTEGER       NOT NULL REFERENCES rooms(id),
  guest_id      INTEGER       NOT NULL REFERENCES guests(id),
  check_in      DATE          NOT NULL,
  check_out     DATE          NOT NULL,
  guests_count  INTEGER       NOT NULL CHECK (guests_count > 0),
  status        VARCHAR(20)   NOT NULL DEFAULT 'confirmed'
                CHECK (status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled')),
  total_price   NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  notes         TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT reservations_dates_check CHECK (check_out > check_in),
  -- Last line of defence against double booking: two active reservations for the
  -- same room can never have overlapping [check_in, check_out) ranges, even when
  -- two requests arrive at exactly the same moment.
  CONSTRAINT reservations_no_overlap EXCLUDE USING gist (
    room_id WITH =,
    daterange(check_in, check_out, '[)') WITH &&
  ) WHERE (status <> 'cancelled')
);

CREATE INDEX reservations_dates_idx ON reservations (check_in, check_out);
CREATE INDEX reservations_status_idx ON reservations (status);
