import { ConfigRule, RuleScope } from '@onreel/shared';
import { Pool } from 'pg';

import { deserializePatch, serializePatchForDb } from './serialization.js';

export type RuleInsert = {
  scope: RuleScope;
  priority: number;
  selector: Record<string, unknown>;
  patch: Record<string, unknown>;
  startAt?: Date;
  endAt?: Date;
  reason?: string;
  note?: string;
  createdBy: string;
};

function fromRow(row: Record<string, unknown>): ConfigRule {
  return {
    id: String(row.id),
    scope: row.scope as RuleScope,
    priority: Number(row.priority),
    enabled: Boolean(row.enabled),
    selector: (row.selector as Record<string, unknown>) ?? {},
    patch: deserializePatch((row.patch as Record<string, unknown>) ?? {}),
    startAt: row.start_at ? new Date(String(row.start_at)) : undefined,
    endAt: row.end_at ? new Date(String(row.end_at)) : undefined,
    reason: row.reason ? String(row.reason) : undefined,
    note: row.note ? String(row.note) : undefined,
    createdAt: new Date(String(row.created_at)),
  };
}

export async function insertRule(db: Pool, input: RuleInsert): Promise<ConfigRule> {
  const { rows } = await db.query(
    `
    INSERT INTO policy_rules (
      scope,
      priority,
      selector,
      patch,
      start_at,
      end_at,
      reason,
      note,
      created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
    `,
    [
      input.scope,
      input.priority,
      input.selector,
      serializePatchForDb(input.patch),
      input.startAt ?? null,
      input.endAt ?? null,
      input.reason ?? null,
      input.note ?? null,
      input.createdBy,
    ],
  );

  return fromRow(rows[0] as Record<string, unknown>);
}

export async function listActiveRules(db: Pool, at: Date): Promise<ConfigRule[]> {
  const { rows } = await db.query(
    `
    SELECT *
    FROM policy_rules
    WHERE enabled = TRUE
      AND (start_at IS NULL OR start_at <= $1)
      AND (end_at IS NULL OR end_at > $1)
    ORDER BY created_at ASC
    `,
    [at],
  );

  return rows.map((row) => fromRow(row as Record<string, unknown>));
}

export async function disableRule(db: Pool, ruleId: string): Promise<void> {
  await db.query(
    `
    UPDATE policy_rules
    SET enabled = FALSE, updated_at = now()
    WHERE id = $1
    `,
    [ruleId],
  );
}
