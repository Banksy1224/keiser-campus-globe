import pg from "pg";

const memoryRows = [];
let memoryId = 1;
let pool = null;
let tableReady = false;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "0" ? false : { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function ensureTable(client) {
  if (tableReady) return;
  await client.query(`
    CREATE TABLE IF NOT EXISTS rfi_inquiries (
      id SERIAL PRIMARY KEY,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      tcpa_consent BOOLEAN NOT NULL,
      campus_id TEXT NOT NULL,
      campus_name TEXT NOT NULL,
      program TEXT NOT NULL,
      start_term TEXT NOT NULL,
      education_level TEXT NOT NULL,
      modality TEXT NOT NULL,
      language TEXT NOT NULL,
      source TEXT NOT NULL,
      utm_source TEXT NOT NULL,
      utm_medium TEXT,
      utm_campaign TEXT,
      destination_email TEXT,
      emailed BOOLEAN NOT NULL DEFAULT FALSE,
      webhooked BOOLEAN NOT NULL DEFAULT FALSE,
      smtp_configured BOOLEAN NOT NULL DEFAULT FALSE,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  tableReady = true;
}

function memoryRow(values, id = memoryId++) {
  return {
    id,
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    phone: values.phone,
    tcpaConsent: values.tcpaConsent,
    campusId: values.campusId,
    campusName: values.campusName,
    program: values.program,
    startTerm: values.startTerm,
    educationLevel: values.educationLevel,
    modality: values.modality,
    language: values.language,
    source: values.source,
    utmSource: values.utmSource,
    utmMedium: values.utmMedium ?? null,
    utmCampaign: values.utmCampaign ?? null,
    destinationEmail: values.destinationEmail ?? null,
    emailed: values.emailed ?? false,
    webhooked: values.webhooked ?? false,
    smtpConfigured: values.smtpConfigured ?? false,
    submittedAt: values.submittedAt ?? new Date(),
  };
}

/**
 * Persist an RFI. Uses rfi_inquiries when DATABASE_URL is set; otherwise
 * process memory so a missing database never 500s a prospect.
 * This table is Keiser Globe only — do not write SEC Genie tables (there are none here).
 */
export async function persistRfiInquiry(values) {
  const database = getPool();
  if (database) {
    try {
      await ensureTable(database);
      const result = await database.query(
        `INSERT INTO rfi_inquiries (
          first_name, last_name, email, phone, tcpa_consent,
          campus_id, campus_name, program, start_term, education_level,
          modality, language, source, utm_source, utm_medium, utm_campaign,
          destination_email, emailed, webhooked, smtp_configured, submitted_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
        ) RETURNING id`,
        [
          values.firstName,
          values.lastName,
          values.email,
          values.phone,
          values.tcpaConsent,
          values.campusId,
          values.campusName,
          values.program,
          values.startTerm,
          values.educationLevel,
          values.modality,
          values.language,
          values.source,
          values.utmSource,
          values.utmMedium ?? null,
          values.utmCampaign ?? null,
          values.destinationEmail ?? null,
          values.emailed ?? false,
          values.webhooked ?? false,
          values.smtpConfigured ?? false,
          values.submittedAt ?? new Date(),
        ],
      );
      return { row: memoryRow(values, result.rows[0].id), durable: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      console.error(`RFI persist: database insert failed (${message}); using memory fallback`);
    }
  } else {
    console.warn("RFI persist: DATABASE_URL is not set; saving in memory only (not durable)");
  }

  const row = memoryRow(values);
  memoryRows.push(row);
  return { row, durable: false };
}

export async function updateRfiDispatch(id, patch, durable) {
  if (durable) {
    const database = getPool();
    if (database) {
      try {
        await database.query(
          `UPDATE rfi_inquiries SET emailed = $1, webhooked = $2 WHERE id = $3`,
          [patch.emailed, patch.webhooked, id],
        );
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown";
        console.error(`RFI persist: dispatch flag update failed (${message})`);
      }
    }
  }
  const row = memoryRows.find((r) => r.id === id);
  if (row) {
    row.emailed = patch.emailed;
    row.webhooked = patch.webhooked;
  }
}
